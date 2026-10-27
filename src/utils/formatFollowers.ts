import type { SocialPlatform } from '../types/social';
/** Compact English display; use platform-specific compact precision. */
export function formatFollowers(count: number | undefined, platform: SocialPlatform): string | undefined {
  if (count === undefined || !Number.isFinite(count) || count < 0) return undefined;
  const unit = count >= 1_000_000_000 ? 1_000_000_000 : count >= 1_000_000 ? 1_000_000 : count >= 1_000 ? 1_000 : 1;
  const suffix = unit === 1_000_000_000 ? 'B' : unit === 1_000_000 ? 'M' : unit === 1_000 ? 'K' : '';
  const compact = platform === 'facebook' ? Math.round(count / unit * 10) / 10 : Math.floor(count / unit * 10) / 10;
  const value = unit === 1 ? String(Math.floor(count)) : String(compact);
  return `${value}${suffix} ${platform === 'youtube' ? (count === 1 ? 'Subscriber' : 'Subscribers') : (count === 1 ? 'Follower' : 'Followers')}`;
}
