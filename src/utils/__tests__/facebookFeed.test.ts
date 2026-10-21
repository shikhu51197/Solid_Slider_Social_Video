import { expect, it } from 'vitest';
import { selectLatestFacebookPost } from '../facebookFeed';
import type { SocialPost } from '../../types/social';
it('selects the newest post including updated author/metrics and tolerates missing dates', () => {
  const old = { id: 'old', publishedAt: '2026-10-20' } as SocialPost;
  const updated = { id: 'new', publishedAt: '2026-10-21', account: { displayName: 'Updated author' }, likesCount: '9' } as SocialPost;
  expect(selectLatestFacebookPost([old, updated])).toBe(updated);
  expect(selectLatestFacebookPost([{ id: 'no-date' } as SocialPost, updated])).toBe(updated);
  expect(selectLatestFacebookPost([])).toBeUndefined();
});
