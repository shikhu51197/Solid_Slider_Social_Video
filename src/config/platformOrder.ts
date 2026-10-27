import { SOCIAL_PLATFORMS, type SocialPlatform } from '../types/social';

/** All supported platforms must appear exactly once. */
export function parsePlatformOrder(value: string | undefined): readonly SocialPlatform[] {
  if (value === undefined || value.trim() === '') return [...SOCIAL_PLATFORMS];
  const platforms = value.split(',').map(platform => platform.trim());
  if (platforms.length !== SOCIAL_PLATFORMS.length ||
      new Set(platforms).size !== SOCIAL_PLATFORMS.length ||
      !platforms.every(platform => SOCIAL_PLATFORMS.some(supported => supported === platform))) {
    throw new Error(`platformOrder must contain each platform exactly once: ${SOCIAL_PLATFORMS.join(',')}`);
  }
  return platforms as SocialPlatform[];
}
