import { FEED_REFRESH_MS, PLATFORM_LABELS } from '../config/social';
import type { ISocialDataProvider, SocialAccount, SocialDataResult, SocialPlatform, SocialPost } from '../types/social';
import { fetchWithTimeout } from '../utils/http';

interface FeedResponse {
  posts?: unknown;
  account?: SocialAccount;
  status?: string;
  errorCategory?: string;
  message?: string;
  error?: string;
}

function isSocialPost(value: unknown, platform: SocialPlatform): value is SocialPost {
  if (!value || typeof value !== 'object') return false;
  const post = value as Partial<SocialPost>;
  return post.platform === platform && typeof post.id === 'string' &&
    typeof post.postUrl === 'string' && typeof post.caption === 'string' &&
    typeof post.thumbnailUrl === 'string' && Boolean(post.account) &&
    typeof post.account?.displayName === 'string' && typeof post.account?.handle === 'string' &&
    typeof post.account?.profileUrl === 'string' && typeof post.account?.avatarUrl === 'string';
}

/** Shared same-origin API adapter. Credentials and platform requests stay server-side. */
export class SocialApiDataProvider implements ISocialDataProvider {
  private cachedResult: SocialDataResult | null = null;
  private lastFetchedAt = 0;
  private pending: Promise<SocialDataResult> | undefined;

  constructor(
    private platform: SocialPlatform,
    private endpointUrl = `/api/social/${platform}`,
    private cacheTtlSeconds = FEED_REFRESH_MS[platform] / 1000,
  ) { }

  async getPosts(forceRefresh = false): Promise<SocialDataResult> {
    if (this.pending) return this.pending;
    if (!forceRefresh && this.cachedResult && Date.now() - this.lastFetchedAt < this.cacheTtlSeconds * 1000) {
      return { ...this.cachedResult, dataSource: 'cached' };
    }
    this.pending = this.fetchPosts(forceRefresh).finally(() => { this.pending = undefined; });
    return this.pending;
  }

  private async fetchPosts(forceRefresh: boolean): Promise<SocialDataResult> {
    try {
      const response = await fetchWithTimeout(this.endpointUrl, {
        headers: { Accept: 'application/json' },
        cache: forceRefresh ? 'no-cache' : 'default',
      }, 25_000); // Allow the server's 20-second upstream budget plus network overhead.
      const data = await response.json() as FeedResponse;
      if (!data || typeof data !== 'object') return this.failure('invalid_response');
      if (!response.ok || data.status === 'error' || data.status === 'unconfigured') {
        return this.failure(data.errorCategory || 'network_error', data.message || data.error, data.account);
      }
      if (!Array.isArray(data.posts) || !data.posts.every(post => isSocialPost(post, this.platform))) {
        return this.failure('invalid_response');
      }
      const result: SocialDataResult = {
        posts: data.posts, account: data.account,
        status: data.posts.length ? 'success' : 'empty', dataSource: 'live-api',
        lastRefreshedAt: new Date().toISOString(), cacheTtlSeconds: this.cacheTtlSeconds,
      };
      this.cachedResult = result;
      this.lastFetchedAt = Date.now();
      return result;
    } catch {
      return this.failure('network_error');
    }
  }

  private failure(errorCategory: string, message?: string, account?: SocialAccount): SocialDataResult {
    return {
      posts: [], status: 'error', dataSource: 'live-api', errorCategory, account,
      errorMessage: message || `Unable to load ${PLATFORM_LABELS[this.platform]} posts.`
    };
  }

  async getAccount(handle: string): Promise<SocialAccount | null> {
    const result = await this.getPosts();
    const normalize = (value: string) => value.replace(/^@/, '').toLowerCase();
    return [result.account, ...result.posts.map(post => post.account)]
      .find(account => account && normalize(account.handle) === normalize(handle)) || null;
  }
}

export function createSocialDataProviders(): Record<SocialPlatform, ISocialDataProvider> {
  return {
    instagram: new SocialApiDataProvider('instagram'),
    youtube: new SocialApiDataProvider('youtube'),
    facebook: new SocialApiDataProvider('facebook'),
  };
}
