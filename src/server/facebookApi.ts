import { createHash } from 'node:crypto';
import type { FacebookNode, FacebookResponse } from './platformTypes.js';
import { fetchUpstream as fetch } from './upstreamFetch.js';
import type { SocialPost, SocialPlatform, SocialPostType, SocialAccount } from '../types/social.js';
import { getPlatformDeepLink } from '../utils/deepLink.js';
import { getCached, setCached, formatMetricNumber } from './socialApiShared.js';
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

/** Keep rotated credentials isolated without retaining raw tokens in cache keys. */
export function facebookCredentialVersion(token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''): string {
  return createHash('sha256').update(token).digest('hex');
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
        'Facebook Page access token has expired (Session expired). Replace FACEBOOK_PAGE_ACCESS_TOKEN in the environment running this server. For local development, update .env or .env.local and restart the development server. A working deployment can use a different token.',
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
 * Facebook connection diagnostic that checks the configured token
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
    let connData: FacebookResponse | null = null;
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
    let postsData: FacebookResponse | null = null;
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
    let photosData: FacebookResponse | null = null;
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
// Optional fields must never prevent a permitted post from loading.
async function readFacebookNode(id: string, fields: string, token: string): Promise<FacebookNode | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`);
    if (!response.ok) return null;
    const data = await response.json() as FacebookNode;
    return data.error ? null : data;
  } catch {
    return null;
  }
}

async function fetchFromPostsEndpoint(
  pageId: string,
  token: string,
  limit: number,
  pageAccount: SocialAccount
): Promise<SocialPost[] | null> {
  const fields = 'id,message,created_time,permalink_url,full_picture';
  const url = `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}/posts?fields=${encodeURIComponent(fields)}&limit=${limit}&access_token=${encodeURIComponent(token)}`;
  let rawPosts: FacebookNode[];
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as FacebookResponse;
    if (!Array.isArray(data.data)) return null;
    rawPosts = data.data;
  } catch {
    return null;
  }

  return Promise.all(rawPosts.map(async (item): Promise<SocialPost> => {
    const [attachments, engagement, author] = await Promise.all([
      readFacebookNode(item.id, 'attachments{media,type,url,title,description,target}', token),
      readFacebookNode(item.id, 'likes.summary(true),comments.summary(true)', token),
      readFacebookNode(item.id, 'from{id,name,picture}', token),
    ]);
    const attachment = attachments?.attachments?.data?.[0];
    const isVideo = /video|reel/i.test(attachment?.type || '') || /\/(reel|videos)\//.test(item.permalink_url || '');
    const videoId = isVideo ? attachment?.target?.id : undefined;
    const [video, videoViews] = videoId ? await Promise.all([
      readFacebookNode(videoId, 'title,description,source', token),
      readFacebookNode(videoId, 'views', token),
    ]) : [null, null];
    const likes = engagement?.likes?.summary?.total_count ?? null;
    const comments = engagement?.comments?.summary?.total_count ?? null;
    const views = typeof videoViews?.views === 'number' ? videoViews.views : null;
    const caption = item.message || video?.description || attachment?.description || '';
    const title = video?.title || attachment?.title || undefined;
    const thumbnailUrl = attachment?.media?.image?.src || item.full_picture || '/media-placeholder.svg';
    const permalink = item.permalink_url || `https://www.facebook.com/${item.id}`;
    const account = author?.from?.name ? {
      ...pageAccount,
      displayName: author.from.name,
      followersCount: author.from.id === pageId ? pageAccount.followersCount : undefined,
      isVerified: author.from.id === pageId && pageAccount.isVerified,
      avatarUrl: author.from.picture?.data?.url || pageAccount.avatarUrl,
      profileUrl: author.from.id ? `https://www.facebook.com/${author.from.id}` : pageAccount.profileUrl,
    } : pageAccount;
    return {
      id: item.id, platform: 'facebook', account, caption, title,
      description: video?.description || caption,
      thumbnailUrl, postUrl: permalink, permalink,
      deepLinkUrl: getPlatformDeepLink('facebook', permalink),
      postType: isVideo ? 'video' : 'image', aspectRatio: 'square',
      likesCount: likes !== null ? formatMetricNumber(likes) : undefined,
      commentsCount: comments !== null ? formatMetricNumber(comments) : undefined,
      viewsCount: views !== null ? formatMetricNumber(views) : undefined,
      publishedAt: item.created_time,
      mediaType: isVideo ? 'video' : 'image',
      mediaUrl: video?.source || (isVideo ? null : thumbnailUrl),
      videoId, likes, comments, views, channelName: account.displayName,
    };
  }));
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

  const data = await res.json() as FacebookResponse;
  const rawPhotos = data.data || [];
  if (rawPhotos.length === 0) return [];

  // Parallel engagement fetching per photo node
  const engagementMap = new Map<string, { likes: number | null; comments: number | null }>();
  await Promise.allSettled(
    rawPhotos.map(async (photo) => {
      try {
        const engRes = await fetch(
          `https://graph.facebook.com/v26.0/${encodeURIComponent(photo.id)}?fields=likes.summary(true),comments.summary(true)&access_token=${encodeURIComponent(token)}`
        );
        if (engRes.ok) {
          const engData = await engRes.json() as FacebookNode;
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

  return rawPhotos.map((item) => {
    const images: Array<{ width: number; height: number; source: string }> = item.images || [];
    const largestImage = images.length > 0
      ? images.reduce((best, img) => (img.width * img.height > best.width * best.height ? img : best), images[0])
      : null;
    const thumbnailUrl: string = largestImage?.source || '/media-placeholder.svg';
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
      title: undefined,
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
export interface FacebookFeedResult {
  posts: SocialPost[];
  source: 'facebook';
  status: 'success' | 'unconfigured' | 'error' | 'empty';
  errorCategory?: FacebookErrorCategory;
  message?: string;
  account?: SocialAccount;
  requiredPermissions?: string[];
  diagnostic?: FacebookDiagnosticResult;
}

export async function fetchFacebookPosts(options?: {
  pageId?: string;
  accessToken?: string;
  limit?: number;
}): Promise<FacebookFeedResult> {
  const pageId = options?.pageId || process.env.FACEBOOK_PAGE_ID;
  const token = options?.accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const limit = options?.limit || 10;

  const defaultPageAccount: SocialAccount = {
    handle: pageId || 'facebook',
    displayName: 'Facebook Page',
    profileUrl: pageId ? `https://www.facebook.com/${pageId}` : '',
    avatarUrl: '/facebook-logo.svg',
    isVerified: false,
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

  const cacheKey = `facebook_${pageId}_${limit}_${facebookCredentialVersion(token)}`;
  {
    const cached = getCached<FacebookFeedResult>(cacheKey, 60_000);
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
    const metaUrl = `https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}?fields=id,name,link,picture.type(large)&access_token=${encodeURIComponent(token)}`;
    const metaRes = await fetch(metaUrl);
    if (metaRes.ok) {
      const metaData = await metaRes.json() as FacebookNode;
      const [followers, verification] = await Promise.all([
        readFacebookNode(pageId, 'followers_count', token),
        readFacebookNode(pageId, 'is_verified', token),
      ]);
      if (metaData?.name && !metaData.error) {
        pageAccount = {
          handle: metaData.link
            ? metaData.link.replace('https://www.facebook.com/', '').replace(/\/$/, '')
            : `page_${pageId}`,
          displayName: metaData.name,
          profileUrl: metaData.link || `https://www.facebook.com/${pageId}`,
          avatarUrl: metaData.picture?.data?.url || '/facebook-logo.svg',
          followersCount:
            typeof followers?.followers_count === 'number'
              ? `${formatMetricNumber(followers.followers_count)} Followers`
              : undefined,
          isVerified: verification?.is_verified === true,
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
