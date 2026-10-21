import type { SocialPost } from '../types/social';

/** Prefer the newest published post, retaining API order for undated/tied posts. */
export function selectLatestFacebookPost(posts: SocialPost[]): SocialPost | undefined {
  return posts.reduce<SocialPost | undefined>((latest, post) => {
    if (!latest) return post;
    const previousTime = Date.parse(latest.publishedAt || '');
    const nextTime = Date.parse(post.publishedAt || '');
    return Number.isFinite(nextTime) && (!Number.isFinite(previousTime) || nextTime > previousTime)
      ? post : latest;
  }, undefined);
}
