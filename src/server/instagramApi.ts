import type { InstagramProfile, InstagramMedia } from './platformTypes.js';
import { fetchUpstream as fetch } from './upstreamFetch.js';
import type { SocialPost, SocialPlatform, SocialPostType, SocialAccount } from '../types/social.js';
import { getPlatformDeepLink } from '../utils/deepLink.js';
import { getCached, setCached, formatMetricNumber } from './socialApiShared.js';
/**
 * Fetch real Instagram posts from the connected Creator account via Graph API.
 */
export async function fetchInstagramPosts(options?: {
  accessToken?: string;
  userId?: string;
  limit?: number;
}): Promise<{ posts: SocialPost[]; source: 'instagram'; account?: SocialAccount }> {
  const token = options?.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = options?.userId || process.env.INSTAGRAM_USER_ID;
  const limit = options?.limit || 10;

  if (!token) {
    throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured in server environment');
  }

  const cacheKey = `instagram_${userId || 'me'}_${limit}`;
  {
    const cached = getCached<{ posts: SocialPost[]; source: 'instagram'; account?: SocialAccount }>(cacheKey);
    if (cached) return cached;
  }

  const accountId = encodeURIComponent(userId || 'me');

  // 1. Fetch Instagram Account Profile
  let account: SocialAccount = {
    handle: '', displayName: '', profileUrl: '', avatarUrl: '/favicon.svg',
  };

  try {
    const profileRes = await fetch(
      `https://graph.instagram.com/v26.0/${accountId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${encodeURIComponent(token)}`
    );
    if (profileRes.ok) {
      const profileData = await profileRes.json() as InstagramProfile;
      if (profileData && profileData.username) {
        let dynamicFollowers: string | undefined;
        if (typeof profileData.followers_count === 'number') {
          dynamicFollowers = profileData.followers_count === 1 ? '1 Follower' : `${profileData.followers_count} Followers`;
        }
        account = {
          handle: `@${profileData.username}`,
          displayName: profileData.name || profileData.username,
          profileUrl: `https://www.instagram.com/${profileData.username}/`,
          avatarUrl: profileData.profile_picture_url || '/favicon.svg',
          followersCount: dynamicFollowers,
        };
      }
    }
  } catch (err) {
    // Keep profile fields empty when metadata is unavailable.
  }

  // 2. Fetch Media items
  const mediaUrl = `https://graph.instagram.com/v26.0/${accountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${encodeURIComponent(
    token
  )}`;

  const res = await fetch(mediaUrl);
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Instagram API error (${res.status}): ${errBody}`);
  }

  const data = await res.json() as { data?: InstagramMedia[] };
  const rawPosts = data.data || [];

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
      thumbnailUrl: thumbnail || '/media-placeholder.svg',
      postUrl: item.permalink || '',
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
