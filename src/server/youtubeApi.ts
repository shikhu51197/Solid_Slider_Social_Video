import type { YouTubeChannel, YouTubeVideo, YouTubePlaylistItem } from './platformTypes.js';
import { fetchUpstream as fetch } from './upstreamFetch.js';
import type { SocialPost, SocialPlatform, SocialPostType, SocialAccount } from '../types/social.js';
import { getPlatformDeepLink } from '../utils/deepLink.js';
import { getCached, setCached, formatMetricNumber } from './socialApiShared.js';
/**
 * Fetch real YouTube videos using YouTube Data API v3.
 */
export async function fetchYouTubePosts(options?: {
  apiKey?: string;
  handle?: string;
  limit?: number;
}): Promise<{ posts: SocialPost[]; source: 'youtube'; account?: SocialAccount }> {
  const apiKey = options?.apiKey || process.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  const handle = options?.handle || process.env.YOUTUBE_CHANNEL_HANDLE || process.env.VITE_YOUTUBE_CHANNEL_HANDLE || '@bajaj_finance_limited';
  const limit = options?.limit || 10;

  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured in environment');
  }

  const cacheKey = `youtube_${handle}_${limit}`;
  {
    const cached = getCached<{ posts: SocialPost[]; source: 'youtube'; account?: SocialAccount }>(cacheKey);
    if (cached) return cached;
  }

  // 1. Resolve Channel ID and Uploads playlist
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forHandle=${encodeURIComponent(
    handle
  )}&key=${encodeURIComponent(apiKey)}`;

  const chanRes = await fetch(channelUrl);
  if (!chanRes.ok) {
    const errText = await chanRes.text();
    throw new Error(`YouTube Channel API error (${chanRes.status}): ${errText}`);
  }

  const chanData = await chanRes.json() as { items?: YouTubeChannel[] };
  const channelItem = chanData.items?.[0];
  if (!channelItem) {
    throw new Error(`No YouTube channel found for handle: ${handle}`);
  }

  const uploadsPlaylistId = channelItem.contentDetails?.relatedPlaylists?.uploads;
  const channelTitle = channelItem.snippet?.title || handle;
  const avatarUrl =
    channelItem.snippet?.thumbnails?.default?.url ||
    channelItem.snippet?.thumbnails?.medium?.url ||
    '/favicon.svg';
  const subCount = formatMetricNumber(channelItem.statistics?.subscriberCount);

  const account: SocialAccount = {
    handle: channelItem.snippet?.customUrl ? `@${channelItem.snippet.customUrl.replace(/^@/, '')}` : handle,
    displayName: channelTitle,
    profileUrl: `https://www.youtube.com/@${handle.replace(/^@/, '')}`,
    avatarUrl,
    followersCount: subCount ? `${subCount} Subscribers` : undefined,
  };

  if (!uploadsPlaylistId) {
    throw new Error('No uploads playlist found for channel');
  }

  // 2. Fetch Playlist Items
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&playlistId=${encodeURIComponent(
    uploadsPlaylistId
  )}&maxResults=${limit}&key=${encodeURIComponent(apiKey)}`;

  const plRes = await fetch(playlistUrl);
  if (!plRes.ok) {
    throw new Error(`YouTube PlaylistItems error (${plRes.status})`);
  }

  const plData = await plRes.json() as { items?: YouTubePlaylistItem[] };
  const items = plData.items || [];
  const videoIds = items.map((it) => it.contentDetails?.videoId).filter(Boolean);

  if (videoIds.length === 0) {
    const result = { posts: [], source: 'youtube' as const, account };
    setCached(cacheKey, result);
    return result;
  }

  // 3. Fetch Video Details & Engagement Statistics
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${encodeURIComponent(
    videoIds.join(',')
  )}&key=${encodeURIComponent(apiKey)}`;

  const vRes = await fetch(videosUrl);
  if (!vRes.ok) {
    throw new Error(`YouTube Videos API error (${vRes.status})`);
  }

  const vData = await vRes.json() as { items?: YouTubeVideo[] };
  const videoItems = vData.items || [];

  const posts: SocialPost[] = videoItems.map((v) => {
    const snippet = v.snippet || {};
    const stats = v.statistics || {};
    const thumb =
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.standard?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url;

    const likesNum = stats.likeCount !== undefined ? parseInt(stats.likeCount, 10) : null;
    const viewsNum = stats.viewCount !== undefined ? parseInt(stats.viewCount, 10) : null;
    const commentsNum = stats.commentCount !== undefined ? parseInt(stats.commentCount, 10) : null;

    const permalink = `https://www.youtube.com/watch?v=${v.id}`;

    return {
      id: v.id,
      platform: 'youtube' as SocialPlatform,
      account,
      caption: snippet.title || 'YouTube Video',
      thumbnailUrl: thumb || '/media-placeholder.svg',
      postUrl: permalink,
      deepLinkUrl: getPlatformDeepLink('youtube', permalink),
      postType: 'video' as SocialPostType,
      aspectRatio: 'landscape',
      videoId: v.id,
      likesCount: likesNum !== null ? formatMetricNumber(likesNum) : undefined,
      viewsCount: viewsNum !== null ? `${formatMetricNumber(viewsNum)} Views` : undefined,
      commentsCount: commentsNum !== null ? formatMetricNumber(commentsNum) : undefined,
      publishedAt: snippet.publishedAt,

      // Extended normalized attributes
      title: snippet.title,
      description: snippet.description,
      mediaType: 'video',
      mediaUrl: `https://www.youtube.com/embed/${v.id}`,
      permalink,
      likes: likesNum,
      comments: commentsNum,
      views: viewsNum,
      channelName: channelTitle,
    };
  });

  const result = { posts, source: 'youtube' as const, account };
  setCached(cacheKey, result);
  return result;
}
