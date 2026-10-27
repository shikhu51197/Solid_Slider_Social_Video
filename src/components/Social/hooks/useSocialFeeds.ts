import { UI_TEXT } from '../../../config/uiText';
import { RUNTIME } from '../../../config/runtime';
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
  isRetrying?: boolean;
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
    nextRetryAt.set(platform, Date.now() + Math.min(RUNTIME.retryMaxMs, RUNTIME.retryInitialMs * 2 ** Math.min(failureCount - 1, RUNTIME.retryExponentMax)));
    const label = PLATFORM_LABELS[platform];
    setFeeds(previous => ({
      ...previous, [platform]: {
        // Preserve only previously fetched real content during temporary errors.
        // Empty feeds and initial failures never populate fallback account metadata.
        post: result.status === 'error' && previous[platform].post.postUrl
          ? previous[platform].post : createEmptyPost(platform),
        unavailable: {
          isUnavailable: true, title: UI_TEXT.feedUnavailableTitle(label), badge: UI_TEXT.unavailable,
          message: result.status === 'empty'
            ? UI_TEXT.emptyFeed(label)
            : UI_TEXT.failedFeed(label),
          onRetry: () => { void refresh(platform, true); },
        },
      }
    }));
  };

  const refresh = (platform: SocialPlatform, force = false): Promise<void> => {
    if (pending.has(platform)) return pending.get(platform)!;
    if (disposed || (!force && Date.now() < (nextRetryAt.get(platform) || 0))) return Promise.resolve();
    setFeeds(previous => ({
      ...previous,
      [platform]: {
        ...previous[platform],
        unavailable: previous[platform].unavailable
          ? { ...previous[platform].unavailable!, isRetrying: true }
          : null,
      },
    }));
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
      if (!document.hidden) {
        for (const platform of PLATFORM_ORDER) void refresh(platform);
      }
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
