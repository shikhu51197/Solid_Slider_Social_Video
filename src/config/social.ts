import { SOCIAL_PLATFORMS, type SocialPlatform, type SocialPost } from '../types/social';
import { parseSocialCacheTtl } from './cacheTtl';

/** Presentation order and labels are configuration; post content comes from APIs. */
export const PLATFORM_ORDER = SOCIAL_PLATFORMS;
export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook',
};
const cacheTtlMs = parseSocialCacheTtl(import.meta.env.VITE_SOCIAL_CACHE_TTL_MS);
export const FEED_REFRESH_MS: Record<SocialPlatform, number> = {
  instagram: cacheTtlMs, youtube: cacheTtlMs, facebook: cacheTtlMs,
};

/** Empty layout only: never substitutes an account, caption or engagement count. */
export function createEmptyPost(platform: SocialPlatform): SocialPost {
  return {
    id: `empty-${platform}`, platform,
    account: { handle: '', displayName: '', profileUrl: '', avatarUrl: '' },
    caption: '', thumbnailUrl: '/media-placeholder.svg', postUrl: '',
    postType: 'unknown',
  };
}

/** Design badges for the configured brand accounts when public APIs omit verification.
 * Explicit false from an API always takes precedence. Keep this allowlist account-specific.
 */
export const DESIGN_BADGE_HANDLES: Record<SocialPlatform, readonly string[]> = {
  instagram: ['bajajfinance'], youtube: ['bajaj_finance_limited'], facebook: [],
};
export function showAccountBadge(platform: SocialPlatform, account: SocialPost['account']): boolean {
  if (!account.displayName || !account.profileUrl) return false;
  return account.isVerified ?? DESIGN_BADGE_HANDLES[platform].includes(account.handle.replace(/^@/, '').toLowerCase());
}
