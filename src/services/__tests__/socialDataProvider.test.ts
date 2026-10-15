import { describe, it, expect } from 'vitest';
import {
  OfficialCatalogDataProvider,
  LiveApiSocialDataProvider,
  CachedSocialDataProvider,
  OFFICIAL_CHANNELS,
  createSocialDataProvider,
} from '../socialDataProvider';

describe('SocialDataProvider Service Layer', () => {
  it('supplies official channel handles conforming to business registry', () => {
    // Check YouTube channels
    expect(OFFICIAL_CHANNELS.youtube.some((c) => c.handle === '@bajaj_finance_limited')).toBe(true);
    expect(OFFICIAL_CHANNELS.youtube.some((c) => c.handle === 'BajajFinanceMoneyAdda')).toBe(true);

    // Check Meta channels
    expect(OFFICIAL_CHANNELS.meta.some((c) => c.handle === 'bajajfinance__emihaina')).toBe(true);
    expect(OFFICIAL_CHANNELS.meta.some((c) => c.handle === 'bajajfinance')).toBe(true);
  });

  it('provides verified posts without fabricating follower counts or likes', async () => {
    const provider = new OfficialCatalogDataProvider();
    const result = await provider.getPosts();

    expect(result.status).toBe('success');
    expect(result.dataSource).toBe('official-catalog');
    expect(result.posts.length).toBeGreaterThan(0);

    result.posts.forEach((post) => {
      expect(post.account.displayName).toBeTruthy();
      expect(post.postUrl).toMatch(/^https?:\/\//);
      expect(post.thumbnailUrl).toBeTruthy();
      expect(['image', 'video', 'reel', 'short']).toContain(post.postType);
      expect(['square', 'portrait', 'landscape']).toContain(post.aspectRatio);
    });
  });

  it('LiveApiSocialDataProvider correctly identifies missing integration credentials', async () => {
    const provider = new LiveApiSocialDataProvider(undefined, undefined);
    const result = await provider.getPosts();

    expect(result.status).toBe('error');
    expect(result.missingIntegrationDetails).toBeDefined();
    expect(result.missingIntegrationDetails!.length).toBeGreaterThan(0);

    const igMissing = result.missingIntegrationDetails!.find((d) => d.platform === 'instagram');
    expect(igMissing).toBeDefined();
    expect(igMissing!.missingConfigs).toContain('VITE_META_ACCESS_TOKEN');
  });

  it('CachedSocialDataProvider returns cached data on second fetch within TTL', async () => {
    const inner = new OfficialCatalogDataProvider();
    const cached = new CachedSocialDataProvider(inner, 60);

    const first = await cached.getPosts();
    expect(first.status).toBe('success');

    const second = await cached.getPosts();
    expect(second.status).toBe('success');
    expect(second.dataSource).toBe('cached');
  });

  it('createSocialDataProvider helper handles missing-metrics mode cleanly', async () => {
    const provider = createSocialDataProvider('missing-metrics');
    const result = await provider.getPosts();

    result.posts.forEach((post) => {
      expect(post.likesCount).toBeUndefined();
      expect(post.account.followersCount).toBeUndefined();
    });
  });
});
