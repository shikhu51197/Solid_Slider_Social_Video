import type { SocialPlatform, SocialPost } from '../types/social';

/** Presentation order and labels are configuration; post content comes from APIs. */
export const PLATFORM_ORDER = ['instagram', 'youtube', 'facebook'] as const;
export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook',
};
export const FEED_REFRESH_MS: Record<SocialPlatform, number> = {
  instagram: 300_000, youtube: 300_000, facebook: 60_000,
};

/** Empty layout only: never substitutes an account, caption or engagement count. */
export function createEmptyPost(platform: SocialPlatform): SocialPost {
  return {
    id: `empty-${platform}`, platform,
    account: { handle: '', displayName: '', profileUrl: '', avatarUrl: '' },
    caption: '', thumbnailUrl: '/media-placeholder.svg', postUrl: '',
    postType: 'unknown', aspectRatio: 'square',
  };
}
