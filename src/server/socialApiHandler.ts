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
/**
 * Sanitizes strings to prevent accidental leakage of access tokens or secrets.
 */
export function sanitizeFacebookSecrets(str?: string | null, customToken?: string): string {
  if (!str) return '';
  let sanitized = String(str);
  if (customToken && customToken.length > 8) {
    sanitized = sanitized.split(customToken).join('[REDACTED_PAGE_TOKEN]');
  }
  const envToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (envToken && envToken.length > 8) {
    sanitized = sanitized.split(envToken).join('[REDACTED_PAGE_TOKEN]');
  }
  return sanitized
    .replace(/access_token=[a-zA-Z0-9_\-]+/gi, 'access_token=[REDACTED]')
    .replace(/EAA[a-zA-Z0-9_\-]+/gi, '[REDACTED_OAUTH_TOKEN]');
}

export type FacebookErrorCategory =
  | 'unconfigured'
  | 'expired_token'
  | 'missing_permissions'
  | 'rate_limited'
  | 'network_error'
  | 'empty_results'
  | 'unknown';

export interface FacebookDiagnosticResult {
  source: 'facebook';
  configured: boolean;
  pageIdConfigured: boolean;
  tokenConfigured: boolean;
  pageId?: string;
  status: 'ok' | 'error' | 'unconfigured' | 'empty';
  errorCategory?: FacebookErrorCategory;
  message: string;
  endpoints: {
    connection: { tested: boolean; ok: boolean; status?: number; error?: string };
    posts: { tested: boolean; ok: boolean; count?: number; status?: number; error?: string };
    photos: { tested: boolean; ok: boolean; count?: number; status?: number; error?: string };
  };
  requiredPermissions: string[];
}

/**
 * Categorizes Facebook Graph API error responses into distinct, sanitized categories.
 */
export function categorizeFacebookError(
  status: number,
  errorObj?: { message?: string; type?: string; code?: number; error_subcode?: number },
  rawText?: string
): { category: FacebookErrorCategory; sanitizedMessage: string } {
  const code = errorObj?.code;
  const subcode = errorObj?.error_subcode;
  const rawMsg = (errorObj?.message || rawText || '').toLowerCase();

  // 1. Expired or Invalid Token (OAuthException code 190, subcodes 463/467)
  if (
    code === 190 ||
    subcode === 463 ||
    subcode === 467 ||
    rawMsg.includes('session has expired') ||
    rawMsg.includes('validating access token') ||
    rawMsg.includes('error validating access token')
  ) {
    return {
      category: 'expired_token',
      sanitizedMessage:
        'Facebook Page access token has expired (Session expired). Generate a refreshed Page Access Token in Meta for Developers and update FACEBOOK_PAGE_ACCESS_TOKEN in .env.',
    };
  }

  // 2. Missing permissions (code 200, 10, or permission errors)
  if (
    code === 200 ||
    code === 10 ||
    rawMsg.includes('permission') ||
    rawMsg.includes('pages_read_engagement') ||
    rawMsg.includes('pages_read_user_content') ||
    rawMsg.includes('pages_show_list')
  ) {
    return {
      category: 'missing_permissions',
      sanitizedMessage:
        'Facebook Page access token lacks required permissions (pages_read_engagement, pages_read_user_content, pages_show_list).',
    };
  }

  // 3. Rate limiting (codes 4, 17, 32, 613)
  if (
    code === 4 ||
    code === 17 ||
    code === 32 ||
    code === 613 ||
    rawMsg.includes('rate limit') ||
    rawMsg.includes('request limit')
  ) {
    return {
      category: 'rate_limited',
      sanitizedMessage: 'Meta Graph API request limit reached. Please wait before retrying.',
    };
  }

  // 4. Network error / Gateway timeout (HTTP 5xx or fetch aborts)
  if (
    status >= 500 ||
    rawMsg.includes('fetch failed') ||
    rawMsg.includes('network') ||
    rawMsg.includes('econnrefused') ||
    rawMsg.includes('etimedout')
  ) {
    return {
      category: 'network_error',
      sanitizedMessage: 'Unable to reach Facebook Graph API network. Check your connection.',
    };
  }

  return {
    category: 'unknown',
    sanitizedMessage: errorObj?.message
      ? sanitizeFacebookSecrets(errorObj.message)
      : `Facebook API request failed (HTTP ${status}).`,
  };
}

/**
 * Requirement 3 & 4: Safe Facebook connection diagnostic that checks the configured token
 * against `GET /{PAGE_ID}?fields=id,name` and tests posts/photos endpoints separately.
 */
export async function diagnoseFacebookConnection(options?: {
  pageId?: string;
  accessToken?: string;
}): Promise<FacebookDiagnosticResult> {
  const pageId = options?.pageId || process.env.FACEBOOK_PAGE_ID;
  const token = options?.accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  const result: FacebookDiagnosticResult = {
    source: 'facebook',
    configured: Boolean(pageId && token),
    pageIdConfigured: Boolean(pageId),
    tokenConfigured: Boolean(token),
    pageId: pageId ? String(pageId) : undefined,
    status: 'unconfigured',
    errorCategory: 'unconfigured',
    message: 'Facebook Page ID or Page Access Token is missing from server environment.',
    endpoints: {
      connection: { tested: false, ok: false },
      posts: { tested: false, ok: false },
      photos: { tested: false, ok: false },
    },
    requiredPermissions: ['pages_show_list', 'pages_read_engagement', 'pages_read_user_content'],
  };

  if (!pageId || !token) {
    return result;
  }

  // 1. Connection Diagnostic: GET /{PAGE_ID}?fields=id,name
  result.endpoints.connection.tested = true;
  try {
    const connUrl = `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}?fields=id,name&access_token=${encodeURIComponent(token)}`;
    const connRes = await fetch(connUrl);
    const connText = await connRes.text();
    let connData: any = null;
    try {
      connData = JSON.parse(connText);
    } catch {}

    if (!connRes.ok) {
      const { category, sanitizedMessage } = categorizeFacebookError(connRes.status, connData?.error, connText);
      result.status = 'error';
      result.errorCategory = category;
      result.message = sanitizedMessage;
      result.endpoints.connection.status = connRes.status;
      result.endpoints.connection.error = sanitizedMessage;
      return result;
    }

    result.endpoints.connection.ok = true;
    result.endpoints.connection.status = 200;
  } catch (err) {
    const netErr = err instanceof Error ? err.message : 'Connection failed';
    result.status = 'error';
    result.errorCategory = 'network_error';
    result.message = `Network error connecting to Facebook Graph API: ${sanitizeFacebookSecrets(netErr, token)}`;
    result.endpoints.connection.error = result.message;
    return result;
  }

  // 2. Separate Test: GET /{PAGE_ID}/posts
  result.endpoints.posts.tested = true;
  try {
    const postsUrl = `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}/posts?fields=id,message,created_time,permalink_url,full_picture&limit=1&access_token=${encodeURIComponent(token)}`;
    const postsRes = await fetch(postsUrl);
    const postsText = await postsRes.text();
    let postsData: any = null;
    try {
      postsData = JSON.parse(postsText);
    } catch {}

    if (postsRes.ok && postsData && Array.isArray(postsData.data)) {
      result.endpoints.posts.ok = true;
      result.endpoints.posts.status = 200;
      result.endpoints.posts.count = postsData.data.length;
    } else {
      const { sanitizedMessage } = categorizeFacebookError(postsRes.status, postsData?.error, postsText);
      result.endpoints.posts.status = postsRes.status;
      result.endpoints.posts.error = sanitizedMessage;
    }
  } catch (err) {
    result.endpoints.posts.error = 'Network error testing posts endpoint';
  }

  // 3. Separate Test: GET /{PAGE_ID}/photos
  result.endpoints.photos.tested = true;
  try {
    const photosUrl = `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}/photos?fields=id,name,created_time,images,link&limit=1&access_token=${encodeURIComponent(token)}`;
    const photosRes = await fetch(photosUrl);
    const photosText = await photosRes.text();
    let photosData: any = null;
    try {
      photosData = JSON.parse(photosText);
    } catch {}

    if (photosRes.ok && photosData && Array.isArray(photosData.data)) {
      result.endpoints.photos.ok = true;
      result.endpoints.photos.status = 200;
      result.endpoints.photos.count = photosData.data.length;
    } else {
      const { sanitizedMessage } = categorizeFacebookError(photosRes.status, photosData?.error, photosText);
      result.endpoints.photos.status = photosRes.status;
      result.endpoints.photos.error = sanitizedMessage;
    }
  } catch (err) {
    result.endpoints.photos.error = 'Network error testing photos endpoint';
  }

  const hasAnyContent = (result.endpoints.posts.count || 0) > 0 || (result.endpoints.photos.count || 0) > 0;
  if (hasAnyContent) {
    result.status = 'ok';
    result.errorCategory = undefined;
    result.message = 'Facebook Page connection and content endpoints verified successfully.';
  } else {
    result.status = 'empty';
    result.errorCategory = 'empty_results';
    result.message = 'Facebook Page is connected, but no posts or photos were found.';
  }

  return result;
}

/**
 * Fetch Facebook posts from /{PAGE_ID}/posts using supported fields.
 */
async function fetchFromPostsEndpoint(
  pageId: string,
  token: string,
  limit: number,
  pageAccount: SocialAccount
): Promise<SocialPost[] | null> {
  const fields = 'id,message,created_time,permalink_url,full_picture,attachments{media,type,url},likes.summary(true),comments.summary(true)';
  const url = `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}/posts?fields=${encodeURIComponent(fields)}&limit=${limit}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data: any = await res.json();
  const rawPosts: any[] = data.data || [];
  if (rawPosts.length === 0) return [];

  return rawPosts.map((item: any) => {
    const permalink = item.permalink_url || `https://www.facebook.com/${item.id}`;
    const caption = item.message || '';
    const attachmentImg = item.attachments?.data?.[0]?.media?.image?.src;
    const thumbnailUrl = attachmentImg || item.full_picture || '/bajaj-emihaina-thumbnail.jpg';
    const isVideo = item.attachments?.data?.[0]?.type?.includes('video');
    const likes = item.likes?.summary?.total_count ?? null;
    const comments = item.comments?.summary?.total_count ?? null;

    return {
      id: item.id,
      platform: 'facebook' as SocialPlatform,
      account: pageAccount,
      caption,
      thumbnailUrl,
      postUrl: permalink,
      deepLinkUrl: getPlatformDeepLink('facebook', permalink),
      postType: (isVideo ? 'video' : 'image') as SocialPostType,
      aspectRatio: 'square',
      likesCount: likes !== null ? formatMetricNumber(likes) : undefined,
      commentsCount: comments !== null ? formatMetricNumber(comments) : undefined,
      publishedAt: item.created_time,
      title: caption ? caption.slice(0, 60) : undefined,
      description: caption,
      mediaType: isVideo ? 'video' : 'image',
      mediaUrl: thumbnailUrl,
      permalink,
      likes,
      comments,
      views: null,
      channelName: pageAccount.displayName,
    };
  });
}

/**
 * Fetch Facebook photos from /{PAGE_ID}/photos using supported fields.
 */
async function fetchFromPhotosEndpoint(
  pageId: string,
  token: string,
  limit: number,
  pageAccount: SocialAccount
): Promise<SocialPost[] | null> {
  const url = `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}/photos?fields=id,name,created_time,images,link&limit=${limit}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data: any = await res.json();
  const rawPhotos: any[] = data.data || [];
  if (rawPhotos.length === 0) return [];

  // Parallel engagement fetching per photo node
  const engagementMap = new Map<string, { likes: number | null; comments: number | null }>();
  await Promise.allSettled(
    rawPhotos.map(async (photo: any) => {
      try {
        const engRes = await fetch(
          `https://graph.facebook.com/v26.0/${encodeURIComponent(photo.id)}?fields=likes.summary(true),comments.summary(true)&access_token=${encodeURIComponent(token)}`
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
      } catch {}
    })
  );

  return rawPhotos.map((item: any) => {
    const images: Array<{ width: number; height: number; source: string }> = item.images || [];
    const largestImage = images.length > 0
      ? images.reduce((best, img) => (img.width * img.height > best.width * best.height ? img : best), images[0])
      : null;
    const thumbnailUrl: string = largestImage?.source || '/bajaj-emihaina-thumbnail.jpg';
    const permalink = item.link || `https://www.facebook.com/photo.php?fbid=${item.id}`;
    const caption = item.name || '';
    const engagement = engagementMap.get(item.id) || { likes: null, comments: null };

    return {
      id: item.id,
      platform: 'facebook' as SocialPlatform,
      account: pageAccount,
      caption,
      thumbnailUrl,
      postUrl: permalink,
      deepLinkUrl: getPlatformDeepLink('facebook', permalink),
      postType: 'image' as SocialPostType,
      aspectRatio: 'square',
      likesCount: engagement.likes !== null ? formatMetricNumber(engagement.likes) : undefined,
      commentsCount: engagement.comments !== null ? formatMetricNumber(engagement.comments) : undefined,
      publishedAt: item.created_time,
      title: caption ? caption.slice(0, 60) : undefined,
      description: caption,
      mediaType: 'image',
      mediaUrl: thumbnailUrl,
      permalink,
      likes: engagement.likes,
      comments: engagement.comments,
      views: null,
      channelName: pageAccount.displayName,
    };
  });
}

/**
 * Fetch real Facebook posts from connected Page using Meta Graph API v26.0.
 * Safely handles expired tokens, missing permissions, empty results, and rate limits without exposing credentials.
 */
export async function fetchFacebookPosts(options?: {
  pageId?: string;
  accessToken?: string;
  limit?: number;
  forceRefresh?: boolean;
}): Promise<{
  posts: SocialPost[];
  source: 'facebook';
  status: 'success' | 'unconfigured' | 'error' | 'empty';
  errorCategory?: FacebookErrorCategory;
  message?: string;
  account?: SocialAccount;
  requiredPermissions?: string[];
  diagnostic?: FacebookDiagnosticResult;
}> {
  const pageId = options?.pageId || process.env.FACEBOOK_PAGE_ID;
  const token = options?.accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const limit = options?.limit || 10;

  const defaultPageAccount: SocialAccount = {
    handle: 'bajaj.finance.in',
    displayName: 'Bajaj Finance Limited',
    profileUrl: pageId ? `https://www.facebook.com/${pageId}` : 'https://www.facebook.com/bajaj.finance.in/',
    avatarUrl: '/bajaj-finserv-logo.png',
    followersCount: '1.2M Followers',
    isVerified: true,
    businessCategory: 'Official Page',
  };

  if (!pageId || !token) {
    return {
      posts: [],
      source: 'facebook',
      status: 'unconfigured',
      errorCategory: 'unconfigured',
      message:
        'Facebook credentials not configured in server environment. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in .env to connect your Facebook Page.',
      account: defaultPageAccount,
      requiredPermissions: ['pages_show_list', 'pages_read_engagement', 'pages_read_user_content'],
    };
  }

  const cacheKey = `facebook_${pageId}_${limit}`;
  if (!options?.forceRefresh) {
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;
  }

  // Step 1: Run connection diagnostic
  const diagnostic = await diagnoseFacebookConnection({ pageId, accessToken: token });
  if (diagnostic.status === 'error') {
    return {
      posts: [],
      source: 'facebook',
      status: 'error',
      errorCategory: diagnostic.errorCategory,
      message: diagnostic.message,
      account: defaultPageAccount,
      requiredPermissions: diagnostic.requiredPermissions,
      diagnostic,
    };
  }

  // Step 2: Fetch Page metadata for live name/avatar/followers
  let pageAccount = { ...defaultPageAccount };
  try {
    const metaUrl = `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}?fields=id,name,fan_count,link&access_token=${encodeURIComponent(token)}`;
    const metaRes = await fetch(metaUrl);
    if (metaRes.ok) {
      const metaData: any = await metaRes.json();
      if (metaData?.name && !metaData.error) {
        pageAccount = {
          handle: metaData.link
            ? metaData.link.replace('https://www.facebook.com/', '').replace(/\/$/, '')
            : `page_${pageId}`,
          displayName: metaData.name,
          profileUrl: metaData.link || `https://www.facebook.com/${pageId}`,
          avatarUrl: '/bajaj-finserv-logo.png',
          followersCount:
            metaData.fan_count != null
              ? `${formatMetricNumber(metaData.fan_count)} Followers`
              : defaultPageAccount.followersCount,
          isVerified: true,
          businessCategory: 'Official Page',
        };
      }
    }
  } catch {}

  // Step 3: Test posts endpoint first
  const postsFromPosts = await fetchFromPostsEndpoint(pageId, token, limit, pageAccount);
  if (postsFromPosts && postsFromPosts.length > 0) {
    const result = {
      posts: postsFromPosts,
      source: 'facebook' as const,
      status: 'success' as const,
      account: pageAccount,
      diagnostic,
    };
    setCached(cacheKey, result);
    return result;
  }

  // Step 4: Fall back to photos endpoint
  const postsFromPhotos = await fetchFromPhotosEndpoint(pageId, token, limit, pageAccount);
  if (postsFromPhotos && postsFromPhotos.length > 0) {
    const result = {
      posts: postsFromPhotos,
      source: 'facebook' as const,
      status: 'success' as const,
      account: pageAccount,
      diagnostic,
    };
    setCached(cacheKey, result);
    return result;
  }

  // Step 5: Both endpoints returned 0 items
  const emptyResult = {
    posts: [],
    source: 'facebook' as const,
    status: 'empty' as const,
    errorCategory: 'empty_results' as const,
    message: `Facebook Page "${pageAccount.displayName}" is connected (ID: ${pageId}), but has no published posts or photos yet.`,
    account: pageAccount,
    diagnostic,
  };
  setCached(cacheKey, emptyResult);
  return emptyResult;
}

