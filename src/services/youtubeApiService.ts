import type { SocialAccount, SocialPost } from '../types/social';
import { getPlatformDeepLink } from '../utils/deepLink';
import { fetchWithTimeout as fetch } from '../utils/http';

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  handle: string;
  description: string;
  avatarUrl: string;
  subscriberCount?: string;
  subscriberCountRaw?: number;
  videoCount?: string;
  viewCount?: string;
  uploadsPlaylistId: string;
}

export interface YouTubeVideoMetric {
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
}

export interface YouTubeVideoItem {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  aspectRatio: 'landscape' | 'portrait';
  postType: 'video' | 'short';
  duration?: string;
  metrics: YouTubeVideoMetric;
}

/**
 * Formats a raw metric number (e.g. 204000 -> "204K", 15420 -> "15.4K", 1250000 -> "1.2M").
 * Does not assume every metric is present or nonzero.
 */
export function formatMetricNumber(value?: string | number | null): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num)) {
    return undefined;
  }

  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}K`;
  }
  return num.toLocaleString('en-US');
}

/**
 * Gets the YouTube API Key from environment or explicit parameter.
 */
export function getYouTubeApiKey(customKey?: string): string {
  if (customKey && customKey.trim().length > 0) {
    return customKey.trim();
  }
  // Browser credentials are never read from build-time environment variables.
  return '';
}

/**
 * Fetch channel details by handle, username, or channel ID using YouTube Data API v3.
 * Primary endpoint:
 *   GET https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forHandle=@handle&key=API_KEY
 */
export async function fetchYouTubeChannel(
  handleOrId: string,
  apiKey: string = getYouTubeApiKey()
): Promise<YouTubeChannelInfo> {
  if (!apiKey) {
    throw new Error('YouTube API Key is missing. Please provide a valid API key.');
  }

  const cleanInput = handleOrId.trim();
  let queryParam: string;

  if (cleanInput.startsWith('UC') && cleanInput.length >= 24) {
    // Direct Channel ID
    queryParam = `id=${encodeURIComponent(cleanInput)}`;
  } else {
    // Handle format - YouTube expects @handle in forHandle
    const handleWithAt = cleanInput.startsWith('@') ? cleanInput : `@${cleanInput}`;
    queryParam = `forHandle=${encodeURIComponent(handleWithAt)}`;
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&${queryParam}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errText = await response.text();
    let message = `YouTube API Error (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error?.message) {
        message = `${message}: ${errJson.error.message}`;
      }
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  let item = data.items?.[0];

  // Fallback for custom username if forHandle yields 0 results
  if (!item && !cleanInput.startsWith('UC')) {
    const plainUsername = cleanInput.replace(/^@/, '');
    const fallbackUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forUsername=${encodeURIComponent(plainUsername)}&key=${apiKey}`;
    const fallbackRes = await fetch(fallbackUrl);
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      item = fallbackData.items?.[0];
    }
  }

  if (!item) {
    throw new Error(`Channel "${handleOrId}" not found on YouTube.`);
  }

  const snippet = item.snippet || {};
  const statistics = item.statistics || {};
  const contentDetails = item.contentDetails || {};

  const channelId = item.id;
  const uploadsPlaylistId =
    contentDetails.relatedPlaylists?.uploads ||
    (channelId.startsWith('UC') ? 'UU' + channelId.slice(2) : channelId);

  const rawSubCount = statistics.subscriberCount ? parseInt(statistics.subscriberCount, 10) : undefined;
  const subscriberCount = formatMetricNumber(rawSubCount);

  const thumbnails = snippet.thumbnails || {};
  const avatarUrl =
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    '/bajaj-finserv-logo.png';

  return {
    id: channelId,
    title: snippet.title || 'YouTube Channel',
    handle: snippet.customUrl ? (snippet.customUrl.startsWith('@') ? snippet.customUrl : `@${snippet.customUrl}`) : cleanInput,
    description: snippet.description || '',
    avatarUrl,
    subscriberCount: subscriberCount ? `${subscriberCount} Subscribers` : undefined,
    subscriberCountRaw: rawSubCount,
    videoCount: statistics.videoCount ? formatMetricNumber(statistics.videoCount) : undefined,
    viewCount: statistics.viewCount ? formatMetricNumber(statistics.viewCount) : undefined,
    uploadsPlaylistId,
  };
}

/**
 * Fetch video IDs from channel's uploads playlist.
 * Quota cost: 1 unit (compared to 100 units for search.list).
 */
export async function fetchUploadsPlaylistItems(
  uploadsPlaylistId: string,
  maxResults = 10,
  apiKey: string = getYouTubeApiKey()
): Promise<string[]> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=${maxResults}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch uploads playlist items (${response.status})`);
  }

  const data = await response.json();
  const items = data.items || [];
  return items
    .map((item: { contentDetails?: { videoId?: string } }) => item.contentDetails?.videoId)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
}

/**
 * Fetch full video details including snippet and statistics.
 * "The response can include viewCount, likeCount, and commentCount, depending on availability.
 * Do not assume every video exposes every metric."
 */
export async function fetchVideosDetails(
  videoIds: string[],
  apiKey: string = getYouTubeApiKey()
): Promise<YouTubeVideoItem[]> {
  if (videoIds.length === 0) return [];

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch video statistics (${response.status})`);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((item: {
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: {
        maxres?: { url: string };
        standard?: { url: string };
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
      tags?: string[];
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    contentDetails?: {
      duration?: string;
    };
  }) => {
    const snip = item.snippet || {};
    const stats = item.statistics || {};
    const content = item.contentDetails || {};

    const thumbs = snip.thumbnails || {};
    const thumbnailUrl =
      thumbs.maxres?.url ||
      thumbs.standard?.url ||
      thumbs.high?.url ||
      thumbs.medium?.url ||
      thumbs.default?.url ||
      '';

    // Safely extract optional metrics - Never assume they exist!
    const metrics: YouTubeVideoMetric = {};
    if (stats.viewCount !== undefined && stats.viewCount !== null && stats.viewCount !== '') {
      metrics.viewCount = formatMetricNumber(stats.viewCount);
    }
    if (stats.likeCount !== undefined && stats.likeCount !== null && stats.likeCount !== '') {
      metrics.likeCount = formatMetricNumber(stats.likeCount);
    }
    if (stats.commentCount !== undefined && stats.commentCount !== null && stats.commentCount !== '') {
      metrics.commentCount = formatMetricNumber(stats.commentCount);
    }

    // Detect Shorts (duration <= 60s or #shorts tag)
    const titleLower = (snip.title || '').toLowerCase();
    const isShort =
      titleLower.includes('#short') ||
      (Array.isArray(snip.tags) && snip.tags.some((t) => t.toLowerCase().includes('short')));

    return {
      id: item.id,
      title: snip.title || 'YouTube Video',
      description: snip.description || '',
      publishedAt: snip.publishedAt || '',
      thumbnailUrl,
      aspectRatio: isShort ? 'portrait' : 'landscape',
      postType: isShort ? 'short' : 'video',
      duration: content.duration,
      metrics,
    };
  });
}

/**
 * Complete high-level fetch flow:
 * 1. Find channel ID & uploads playlist from handle (using the user's endpoint)
 * 2. Fetch latest videos from channel uploads
 * 3. Fetch video snippet and statistics (viewCount, likeCount, commentCount)
 * 4. Transform into standardized SocialPost format for the slider
 */
export async function fetchYouTubeChannelSliderPosts(
  handleOrId: string = '@bajaj_finance_limited',
  maxResults = 10,
  apiKey: string = getYouTubeApiKey()
): Promise<{ channel: YouTubeChannelInfo; posts: SocialPost[] }> {
  // 1. Channel lookup
  const channel = await fetchYouTubeChannel(handleOrId, apiKey);

  // 2. Fetch video IDs from uploads playlist
  const videoIds = await fetchUploadsPlaylistItems(channel.uploadsPlaylistId, maxResults, apiKey);

  if (videoIds.length === 0) {
    return { channel, posts: [] };
  }

  // 3. Fetch video details & statistics
  const videoDetails = await fetchVideosDetails(videoIds, apiKey);

  // 4. Transform into SocialPost
  const account: SocialAccount = {
    handle: channel.handle,
    displayName: channel.title,
    profileUrl: `https://www.youtube.com/${channel.handle}`,
    avatarUrl: channel.avatarUrl,
    followersCount: channel.subscriberCount,
    isVerified: true,
    businessCategory: 'Official Channel',
  };

  const posts: SocialPost[] = videoDetails.map((vid) => {
    const postUrl = `https://www.youtube.com/watch?v=${vid.id}`;
    const deepLinkUrl = getPlatformDeepLink('youtube', postUrl);

    return {
      id: `yt-${vid.id}`,
      platform: 'youtube',
      account,
      caption: vid.title,
      thumbnailUrl: vid.thumbnailUrl,
      postUrl,
      deepLinkUrl,
      postType: vid.postType,
      aspectRatio: vid.aspectRatio,
      likesCount: vid.metrics.likeCount,
      commentsCount: vid.metrics.commentCount,
      viewsCount: vid.metrics.viewCount ? `${vid.metrics.viewCount} views` : undefined,
      videoId: vid.id,
      publishedAt: vid.publishedAt,
    };
  });

  return { channel, posts };
}
