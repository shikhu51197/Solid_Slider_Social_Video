import { createSignal, onCleanup, onMount } from 'solid-js';
import { createEmptyPost, FEED_REFRESH_MS, PLATFORM_LABELS, PLATFORM_ORDER } from '../../../config/social';
import { createSocialDataProviders } from '../../../services/socialDataProvider';
import type { ISocialDataProvider, SocialDataResult, SocialPlatform, SocialPost } from '../../../types/social';
import { selectLatestFacebookPost } from '../../../utils/facebookFeed';

export interface FeedUnavailable {
  isUnavailable: boolean;
  title: string;
  message: string;
  badge: string;
  onRetry: () => void;
}

interface FeedState {
  post: SocialPost;
  unavailable: FeedUnavailable | null;
}

/** Independent feed requests, polling, retry backoff and lifecycle cleanup. */
export function useSocialFeeds(overrides?: Partial<Record<SocialPlatform, ISocialDataProvider>>) {
  const providers = { ...createSocialDataProviders(), ...overrides };
  const [feeds, setFeeds] = createSignal<Record<SocialPlatform, FeedState>>({
    instagram: { post: createEmptyPost('instagram'), unavailable: null },
    youtube: { post: createEmptyPost('youtube'), unavailable: null },
    facebook: { post: createEmptyPost('facebook'), unavailable: null },
  });
  const pending = new Map<SocialPlatform, Promise<void>>();
  const failures = new Map<SocialPlatform, number>();
  const nextRetryAt = new Map<SocialPlatform, number>();
  let disposed = false;

  const applyResult = (platform: SocialPlatform, result: SocialDataResult) => {
    if (disposed) return;
    const post = platform === 'facebook' ? selectLatestFacebookPost(result.posts) : result.posts[0];
    if (result.status === 'success' && post) {
      setFeeds(previous => ({ ...previous, [platform]: { post, unavailable: null } }));
      failures.delete(platform);
      nextRetryAt.delete(platform);
      return;
    }

    const failureCount = (failures.get(platform) || 0) + 1;
    failures.set(platform, failureCount);
    nextRetryAt.set(platform, Date.now() + Math.min(300_000, 30_000 * 2 ** Math.min(failureCount - 1, 4)));
    // Keep real content during temporary outages; an explicitly empty feed clears it.
    if (feeds()[platform].post.postUrl && result.status !== 'empty') return;
    const emptyPost = createEmptyPost(platform);
    const label = PLATFORM_LABELS[platform];
    setFeeds(previous => ({
      ...previous, [platform]: {
        post: { ...emptyPost, account: result.account || emptyPost.account },
        unavailable: {
          isUnavailable: true, title: `${label} Content Unavailable`, badge: 'Unavailable',
          message: `Unable to load ${label} posts. Please try again shortly.`,
          onRetry: () => { void refresh(platform, true); },
        },
      }
    }));
  };

  const refresh = (platform: SocialPlatform, force = false): Promise<void> => {
    if (pending.has(platform)) return pending.get(platform)!;
    if (disposed || (!force && Date.now() < (nextRetryAt.get(platform) || 0))) return Promise.resolve();
    const request = Promise.resolve().then(() => providers[platform].getPosts(force))
      .then(result => {
        pending.delete(platform);
        applyResult(platform, result);
      })
      .catch(() => {
        pending.delete(platform);
        applyResult(platform, { posts: [], status: 'error', dataSource: 'none', errorCategory: 'network_error' });
      });
    pending.set(platform, request);
    return request;
  };

  onMount(() => {
    for (const platform of PLATFORM_ORDER) void refresh(platform);
    const timers = PLATFORM_ORDER.map(platform => setInterval(() => {
      if (!document.hidden) void refresh(platform);
    }, FEED_REFRESH_MS[platform]));
    const refreshWhenVisible = () => {
      if (!document.hidden) void refresh('facebook');
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('pageshow', refreshWhenVisible);
    onCleanup(() => {
      timers.forEach(clearInterval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('pageshow', refreshWhenVisible);
    });
  });
  onCleanup(() => { disposed = true; });
  return feeds;
}
