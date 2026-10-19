/**
 * Framework-independent domain models for Social Media Slider.
 * Reusable across Solid.js, React, Next.js, and backend services.
 */

export type SocialPlatform = 'instagram' | 'facebook' | 'youtube';
export type SocialPostType = 'image' | 'video' | 'reel' | 'short' | 'carousel' | 'unknown';
export type SocialAspectRatio = 'square' | 'portrait' | 'landscape';

export interface SocialAccount {
  handle: string;
  displayName: string;
  profileUrl: string;
  avatarUrl: string;
  followersCount?: string;
  isVerified?: boolean;
  businessCategory?: string;
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  account: SocialAccount;
  caption: string;
  thumbnailUrl: string;
  postUrl: string;
  deepLinkUrl?: string;
  postType: SocialPostType;
  aspectRatio: SocialAspectRatio;
  likesCount?: string;
  commentsCount?: string;
  viewsCount?: string;
  videoId?: string;
  publishedAt?: string;

  // Normalized Live Commerce Extended Attributes
  title?: string;
  description?: string;
  mediaType?: 'image' | 'video' | 'reel' | 'carousel' | 'unknown';
  mediaUrl?: string | null;
  permalink?: string;
  likes?: number | null;
  comments?: number | null;
  views?: number | null;
  channelName?: string | null;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export interface MissingIntegrationDetail {
  platform: SocialPlatform;
  missingConfigs: string[];
  documentationUrl: string;
  requiredScopes: string[];
}

export interface SocialDataResult {
  posts: SocialPost[];
  status: FetchStatus;
  errorMessage?: string;
  errorCategory?: string;
  account?: SocialAccount;
  dataSource: 'official-catalog' | 'live-api' | 'cached' | 'none';
  lastRefreshedAt?: string;
  cacheTtlSeconds?: number;
  missingIntegrationDetails?: MissingIntegrationDetail[];
}

/**
 * Data provider interface for fetching social media items.
 * Adheres to dependency inversion, separating UI from backend data fetching.
 */
export interface ISocialDataProvider {
  getPosts(forceRefresh?: boolean): Promise<SocialDataResult>;
  getAccount(handle: string): Promise<SocialAccount | null>;
}
