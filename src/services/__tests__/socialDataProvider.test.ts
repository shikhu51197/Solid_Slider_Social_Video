import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSocialDataProviders, SocialApiDataProvider } from '../socialDataProvider';
import { createEmptyPost, PLATFORM_ORDER } from '../../config/social';
import type { SocialPlatform } from '../../types/social';

const post = (platform: SocialPlatform) => ({ ...createEmptyPost(platform), id: 'live-post',
  postUrl: `https://www.${platform}.com/live`, caption: 'API caption',
  account: { handle: '@live', displayName: 'API author', profileUrl: 'https://example.test/live', avatarUrl: '/avatar.svg' } });
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.useRealTimers());

describe('live social API adapters', () => {
  it.each(PLATFORM_ORDER)('fetches %s from the server and preserves live content', async platform => {
    vi.mocked(fetch).mockResolvedValue(respond({ posts: [post(platform)] }));
    const result = await createSocialDataProviders()[platform].getPosts();
    expect(result.status).toBe('success');
    expect(result.posts).toEqual([post(platform)]);
    expect(fetch).toHaveBeenCalledWith(`/api/social/${platform}`, expect.any(Object));
  });

  it('coalesces concurrent calls, caches successes and forwards forced refresh', async () => {
    vi.mocked(fetch).mockImplementation(async () => respond({ posts: [post('instagram')] }));
    const provider = new SocialApiDataProvider('instagram');
    await Promise.all([provider.getPosts(), provider.getPosts()]);
    expect((await provider.getPosts()).dataSource).toBe('cached');
    expect(fetch).toHaveBeenCalledTimes(1);
    await provider.getPosts(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith('/api/social/instagram', expect.objectContaining({ cache: 'no-cache' }));
  });

  it('revalidates when the cache expires', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(async () => respond({ posts: [post('facebook')] }));
    const provider = new SocialApiDataProvider('facebook', undefined, 60);
    await provider.getPosts();
    await vi.advanceTimersByTimeAsync(60_001);
    await provider.getPosts();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reports an empty feed without replacing it with a static post', async () => {
    vi.mocked(fetch).mockResolvedValue(respond({ posts: [], status: 'empty' }));
    expect(await new SocialApiDataProvider('instagram').getPosts()).toMatchObject({ posts: [], status: 'empty' });
  });

  it.each([null, {}, { posts: [{}] }, { posts: [post('facebook')] }])('rejects malformed or wrong-platform data: %j', async body => {
    vi.mocked(fetch).mockResolvedValue(respond(body));
    expect(await new SocialApiDataProvider('instagram').getPosts()).toMatchObject({ posts: [], status: 'error' });
  });

  it('preserves API failure categories and retries without caching the error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respond({ status: 'error', errorCategory: 'expired_token' }))
      .mockResolvedValueOnce(respond({ posts: [post('facebook')] }));
    const provider = new SocialApiDataProvider('facebook');
    expect(await provider.getPosts()).toMatchObject({ posts: [], status: 'error', errorCategory: 'expired_token' });
    expect((await provider.getPosts()).status).toBe('success');
  });

  it('does not fabricate content when the request fails', async () => {
    const result = await new SocialApiDataProvider('youtube').getPosts();
    expect(result).toMatchObject({ posts: [], status: 'error', errorCategory: 'network_error' });
  });

  it('gets account information from the API, including an empty feed', async () => {
    vi.mocked(fetch).mockResolvedValue(respond({ posts: [], account: post('instagram').account }));
    const provider = new SocialApiDataProvider('instagram');
    expect(await provider.getAccount('LIVE')).toEqual(post('instagram').account);
    expect(await provider.getAccount('other')).toBeNull();
  });
});
