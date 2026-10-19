import type { SocialPost, SocialPlatform, SocialPostType, SocialAccount } from '../types/social.ts';
import { getPlatformDeepLink } from '../utils/deepLink.ts';

/**
 * Server-side Social Media API Handler.
 * Executes API requests server-side without exposing access tokens or secrets to client bundles.
 */

// In-memory cache entries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cacheStore = new Map<string, CacheEntry<any>>();
const DEFAULT_CACHE_TTL_MS = 300_000; // 5 minutes

function getCached<T>(key: string, ttlMs = DEFAULT_CACHE_TTL_MS): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  cacheStore.set(key, { data, timestamp: Date.now() });
}

/**
 * Format raw metric numbers into human-readable strings (e.g. 1.2K, 4.4M).
 */
export function formatMetricNumber(val?: number | string | null): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const num = typeof val === 'string' ? parseInt(val, 10) : val;
  if (isNaN(num)) return undefined;

  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}K`;
  }
  return num.toLocaleString();
}

/**
 * Fetch real Instagram posts from the connected Creator account via Graph API.
 */
export async function fetchInstagramPosts(options?: {
  accessToken?: string;
  userId?: string;
  limit?: number;
  forceRefresh?: boolean;
}): Promise<{ posts: SocialPost[]; source: 'instagram'; account?: SocialAccount }> {
  const token = options?.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = options?.userId || process.env.INSTAGRAM_USER_ID;
  const limit = options?.limit || 10;

  if (!token) {
    throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured in server environment');
  }

  const cacheKey = `instagram_${userId || 'me'}_${limit}`;
  if (!options?.forceRefresh) {
    const cached = getCached<{ posts: SocialPost[]; source: 'instagram'; account?: SocialAccount }>(cacheKey);
    if (cached) return cached;
  }

  // 1. Fetch Instagram Account Profile
  let account: SocialAccount = {
    handle: '@hey_learningstar',
    displayName: 'The_Great_life',
    profileUrl: 'https://www.instagram.com/hey_learningstar/',
    avatarUrl: '/bajaj-emihaina-avatar.png',
    followersCount: '2.2M Followers',
    isVerified: true,
  };

  try {
    const profileRes = await fetch(
      `https://graph.instagram.com/v26.0/me?fields=id,username,name,profile_picture_url,followers_count&access_token=${encodeURIComponent(token)}`
    );
    if (profileRes.ok) {
      const profileData: any = await profileRes.json();
      if (profileData && profileData.username) {
        let dynamicFollowers = 'Creator Account';
        if (typeof profileData.followers_count === 'number') {
          dynamicFollowers = profileData.followers_count === 1 ? '1 Follower' : `${profileData.followers_count} Followers`;
        }
        account = {
          handle: `@${profileData.username}`,
          displayName: profileData.name || profileData.username,
          profileUrl: `https://www.instagram.com/${profileData.username}/`,
          avatarUrl: profileData.profile_picture_url || '/bajaj-emihaina-avatar.png',
          followersCount: dynamicFollowers,
          isVerified: true,
        };
      }
    }
  } catch (err) {
    console.warn('[SocialApiHandler] Failed to fetch Instagram profile details, using defaults', err);
  }

  // 2. Fetch Media items
  const mediaUrl = `https://graph.instagram.com/v26.0/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${encodeURIComponent(
    token
  )}`;

  const res = await fetch(mediaUrl);
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Instagram API error (${res.status}): ${errBody}`);
  }

  const data: any = await res.json();
  const rawPosts: any[] = data.data || [];

  const posts: SocialPost[] = rawPosts.map((item) => {
    const rawType = (item.media_type || '').toUpperCase();
    let postType: SocialPostType = 'image';
    if (rawType === 'VIDEO') postType = 'video';
    else if (rawType === 'CAROUSEL_ALBUM') postType = 'carousel';

    const thumbnail = rawType === 'VIDEO' ? (item.thumbnail_url || item.media_url) : (item.media_url || item.thumbnail_url);
    const likesNum = typeof item.like_count === 'number' ? item.like_count : null;
    const commentsNum = typeof item.comments_count === 'number' ? item.comments_count : null;

    return {
      id: item.id,
      platform: 'instagram' as SocialPlatform,
      account,
      caption: item.caption || '',
      thumbnailUrl: thumbnail || '/bajaj-emi-instagram.jpg',
      postUrl: item.permalink || 'https://www.instagram.com/',
      deepLinkUrl: item.permalink ? getPlatformDeepLink('instagram', item.permalink) : undefined,
      postType,
      aspectRatio: 'square',
      likesCount: likesNum !== null ? formatMetricNumber(likesNum) : undefined,
      commentsCount: commentsNum !== null ? formatMetricNumber(commentsNum) : undefined,
      publishedAt: item.timestamp,

      // Extended normalized attributes
      title: item.caption ? item.caption.slice(0, 60) : undefined,
      description: item.caption,
      mediaType: postType,
      mediaUrl: item.media_url,
      permalink: item.permalink,
      likes: likesNum,
      comments: commentsNum,
      views: null,
      channelName: account.displayName,
    };
  });

  const result = { posts, source: 'instagram' as const, account };
  setCached(cacheKey, result);
  return result;
}

/**
 * Fetch real YouTube videos using YouTube Data API v3.
 */
export async function fetchYouTubePosts(options?: {
  apiKey?: string;
  handle?: string;
  limit?: number;
  forceRefresh?: boolean;
}): Promise<{ posts: SocialPost[]; source: 'youtube'; account?: SocialAccount }> {
  const apiKey = options?.apiKey || process.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  const handle = options?.handle || process.env.VITE_YOUTUBE_CHANNEL_HANDLE || '@bajaj_finance_limited';
  const limit = options?.limit || 10;

  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured in environment');
  }

  const cacheKey = `youtube_${handle}_${limit}`;
  if (!options?.forceRefresh) {
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

  const chanData: any = await chanRes.json();
  const channelItem = chanData.items?.[0];
  if (!channelItem) {
    throw new Error(`No YouTube channel found for handle: ${handle}`);
  }

  const uploadsPlaylistId = channelItem.contentDetails?.relatedPlaylists?.uploads;
  const channelTitle = channelItem.snippet?.title || 'Bajaj Finance';
  const avatarUrl =
    channelItem.snippet?.thumbnails?.default?.url ||
    channelItem.snippet?.thumbnails?.medium?.url ||
    '/money-adda-logo.jpg';
  const subCount = formatMetricNumber(channelItem.statistics?.subscriberCount);

  const account: SocialAccount = {
    handle: channelItem.snippet?.customUrl ? `@${channelItem.snippet.customUrl.replace(/^@/, '')}` : handle,
    displayName: channelTitle,
    profileUrl: `https://www.youtube.com/${handle.replace(/^@/, '')}`,
    avatarUrl,
    followersCount: subCount ? `${subCount} Subscribers` : undefined,
    isVerified: true,
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

  const plData: any = await plRes.json();
  const items: any[] = plData.items || [];
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

  const vData: any = await vRes.json();
  const videoItems: any[] = vData.items || [];

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
      thumbnailUrl: thumb || '/youtube-sip-thumbnail.jpg',
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

/**
 * Fetch real Facebook Page photos using Facebook Graph API.
 *
 * NOTE: The configured token is a User token for the New Pages Experience.
 * The /posts endpoint requires a proper Page access token for New Pages Experience.
 * The /photos endpoint works with the current token type and returns real photo data.
 *
 * Metrics available via /photos endpoint:
 *   - thumbnailUrl: largest image from images[] array ✅
 *   - caption: item.name (photo caption) ✅
 *   - publishedAt: created_time ✅
 *   - link/permalink: photo permalink ✅
 *   - likes: per-photo summary via individual photo node ✅
 *   - comments: per-photo summary via individual photo node ✅
 *   - views: NOT available for photos; video insights require video-specific Page token ❌
 */
export async function fetchFacebookPosts(options?: {
  pageId?: string;
  accessToken?: string;
  limit?: number;
  forceRefresh?: boolean;
}): Promise<{
  posts: SocialPost[];
  source: 'facebook';
  status: 'success' | 'unconfigured' | 'error';
  message?: string;
  requiredPermissions?: string[];
}> {
  const pageId = options?.pageId || process.env.FACEBOOK_PAGE_ID;
  const token = options?.accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const limit = options?.limit || 10;

  if (!pageId || !token) {
    return {
      posts: [],
      source: 'facebook',
      status: 'unconfigured',
      message:
        'Facebook Page credentials not configured in server environment. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in .env to connect your Facebook Page.',
      requiredPermissions: ['pages_show_list', 'pages_read_engagement', 'pages_read_user_content'],
    };
  }

  const cacheKey = `facebook_${pageId}_${limit}`;
  if (!options?.forceRefresh) {
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;
  }

  try {
    // --- Step 1: Fetch Page profile for display name / account info ---
    let pageAccount = {
      handle: `page_${pageId}`,
      displayName: 'Facebook Page',
      profileUrl: `https://www.facebook.com/profile.php?id=${pageId}`,
      avatarUrl: '/bajaj-finserv-logo.png',
      followersCount: undefined as string | undefined,
      isVerified: false,
    };

    try {
      const pageRes = await fetch(
        `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}?fields=id,name,fan_count,link&access_token=${encodeURIComponent(token)}`
      );
      if (pageRes.ok) {
        const pageData: any = await pageRes.json();
        if (pageData && pageData.name && !pageData.error) {
          const profileUrl = pageData.link || `https://www.facebook.com/profile.php?id=${pageId}`;
          pageAccount = {
            handle: pageData.link
              ? pageData.link.replace('https://www.facebook.com/', '').replace(/\/$/, '')
              : `page_${pageId}`,
            displayName: pageData.name,
            profileUrl,
            avatarUrl: '/bajaj-finserv-logo.png',
            followersCount:
              pageData.fan_count != null
                ? `${formatMetricNumber(pageData.fan_count)} Followers`
                : undefined,
            isVerified: false,
          };
        }
      }
    } catch (_err) {
      // Non-fatal: use defaults
    }

    // --- Step 2: Fetch Page Photos ---
    // /photos endpoint works with the current token type (User token for New Pages Experience).
    // fields: id, name (caption), created_time, images[] (multiple resolutions), link (permalink)
    const photosUrl = `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}/photos?fields=id,name,created_time,images,link&limit=${limit}&access_token=${encodeURIComponent(token)}`;

    const res = await fetch(photosUrl);
    if (!res.ok) {
      const errText = await res.text();
      let apiMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        apiMsg = errJson?.error?.message || errText;
      } catch (_) {
        /* not JSON */
      }
      return {
        posts: [],
        source: 'facebook',
        status: 'error',
        message: `Facebook Graph API error (${res.status}): ${apiMsg}`,
        requiredPermissions: ['pages_read_engagement', 'pages_read_user_content'],
      };
    }

    const data: any = await res.json();
    const rawPhotos: any[] = data.data || [];

    if (rawPhotos.length === 0) {
      // Page is connected and token is valid; no photos uploaded yet.
      const result = {
        posts: [],
        source: 'facebook' as const,
        status: 'success' as const,
        message: `Facebook Page "${pageAccount.displayName}" is connected (ID: ${pageId}) but has no photos yet. Upload photos on the Page to see them here.`,
      };
      setCached(cacheKey, result);
      return result;
    }

    // --- Step 3: Fetch per-photo likes & comments in parallel ---
    // Graph API allows fetching engagement on individual photo nodes.
    const engagementMap = new Map<string, { likes: number | null; comments: number | null }>();
    await Promise.allSettled(
      rawPhotos.map(async (photo: any) => {
        try {
          const engRes = await fetch(
            `https://graph.facebook.com/v26.0/${encodeURIComponent(photo.id)}?fields=likes.summary(true),comments.summary(true)&access_token=${encodeURIComponent(token!)}`
          );
          if (engRes.ok) {
            const engData: any = await engRes.json();
            if (!engData.error) {
              engagementMap.set(photo.id, {
                likes: engData?.likes?.summary?.total_count ?? null,
                comments: engData?.comments?.summary?.total_count ?? null,
              });
            }
          }
        } catch (_err) {
          // Non-fatal; will fall back to null engagement for this photo
        }
      })
    );

    // --- Step 4: Map photos to SocialPost ---
    const posts: SocialPost[] = rawPhotos.map((item: any) => {
      // Pick the largest image by area (width * height) from the images array
      const images: Array<{ width: number; height: number; source: string }> = item.images || [];
      const largestImage = images.length > 0
        ? images.reduce((best, img) => {
          return img.width * img.height > best.width * best.height ? img : best;
        }, images[0])
        : null;
      const thumbnailUrl: string = largestImage?.source || '';

      const permalink = item.link || `https://www.facebook.com/photo.php?fbid=${item.id}`;
      // 'name' is the photo caption in Facebook Graph API
      const caption = item.name || null;
      const engagement = engagementMap.get(item.id) || { likes: null, comments: null };

      return {
        id: item.id,
        platform: 'facebook' as SocialPlatform,
        account: pageAccount,
        caption: caption || '',
        thumbnailUrl,
        postUrl: permalink,
        deepLinkUrl: getPlatformDeepLink('facebook', permalink),
        postType: 'image' as SocialPostType,
        aspectRatio: 'square',
        likesCount: engagement.likes !== null ? formatMetricNumber(engagement.likes) : undefined,
        commentsCount: engagement.comments !== null ? formatMetricNumber(engagement.comments) : undefined,
        publishedAt: item.created_time,

        // Extended normalized attributes
        title: caption ? caption.slice(0, 60) : undefined,
        description: caption,
        mediaType: 'image',
        mediaUrl: thumbnailUrl,
        permalink,
        likes: engagement.likes,
        comments: engagement.comments,
        // views: not available for photos; video insights require a different token type
        views: null,
        channelName: pageAccount.displayName,
      };
    });

    const result = { posts, source: 'facebook' as const, status: 'success' as const };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    return {
      posts: [],
      source: 'facebook',
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown Facebook API error',
    };
  }
}
