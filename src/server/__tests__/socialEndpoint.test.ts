import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../socialApiHandler.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../socialApiHandler.js')>(),
  fetchFacebookPosts: vi.fn(), fetchInstagramPosts: vi.fn(), fetchYouTubePosts: vi.fn(), diagnoseFacebookConnection: vi.fn(),
}));
import { cachedResult, createRateLimiter, createSocialEndpoint, validateQuery } from '../socialEndpoint';
import { fetchFacebookPosts, fetchYouTubePosts } from '../socialApiHandler';

beforeEach(() => { vi.restoreAllMocks(); vi.stubEnv('FACEBOOK_PAGE_ID', '123'); vi.stubEnv('VITE_SOCIAL_CACHE_TTL_MS', '45000'); });

describe('public social API protection', () => {
  it('loads only the env-configured YouTube channel and rejects the old channel allowlist', async () => {
    vi.stubEnv('YOUTUBE_CHANNEL_HANDLE', '@bajaj_finance_limited');
    vi.mocked(fetchYouTubePosts).mockResolvedValue({ posts: [], source: 'youtube' });
    const { GET } = createSocialEndpoint('youtube');
    expect((await GET(new Request('https://example.test/api/social/youtube'))).status).toBe(200);
    expect(fetchYouTubePosts).toHaveBeenLastCalledWith({ limit: 10, handle: '@bajaj_finance_limited' });
    const calls = vi.mocked(fetchYouTubePosts).mock.calls.length;
    for (const handle of ['BajajFinanceMoneyAdda', 'BajajFinanceElectronics', 'BajajFinanceWheels', 'BajajFinanceHowtoGuide', 'other']) {
      expect((await GET(new Request(`https://example.test/api/social/youtube?handle=${handle}`))).status).toBe(400);
    }
    expect(fetchYouTubePosts).toHaveBeenCalledTimes(calls);
    expect(validateQuery('youtube', new URL('https://example.test/api?handle=BAJAJ_FINANCE_LIMITED')).handle).toBe('@bajaj_finance_limited');
    vi.stubEnv('YOUTUBE_CHANNEL_HANDLE', '');
    expect((await GET(new Request('https://example.test/api/social/youtube'))).status).toBe(503);
    vi.unstubAllEnvs();
  });
  it('rejects unknown, repeated, oversized and foreign-page queries', () => {
    for (const query of ['limit=0', 'limit=11', 'limit=1.2', 'limit=NaN', 'limit=1&limit=2', 'pageId=999', 'anything=x']) {
      expect(() => validateQuery('facebook', new URL(`https://example.test/api?${query}`))).toThrow();
    }
    expect(() => validateQuery('youtube', new URL('https://example.test/api?handle=unknown'))).toThrow();
  });
  it('redirects refresh flags to a canonical shared-cache URL without fetching Meta', async () => {
    const { GET } = createSocialEndpoint('facebook');
    const res = await GET(new Request('https://example.test/api/social/facebook?refresh=true'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('/api/social/facebook');
    expect(fetchFacebookPosts).not.toHaveBeenCalled();
  });
  it('coalesces concurrent refreshes and reuses fresh results', async () => {
    const load = vi.fn().mockResolvedValue({ posts: [{ id: 'one' }] });
    await Promise.all([cachedResult('test-concurrent', load, 60_000), cachedResult('test-concurrent', load, 60_000)]);
    await cachedResult('test-concurrent', load, 60_000);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it('limits repeated requests, bounds memory, and resets after the window', () => {
    const allow = createRateLimiter(2, 1000, 2);
    expect(allow('a', 0)).toBe(true); expect(allow('a', 0)).toBe(true); expect(allow('a', 0)).toBe(false);
    expect(allow('b', 0)).toBe(true); expect(allow('c', 0)).toBe(false);
    expect(allow('c', 1001)).toBe(true);
  });
  it('does not expose provider errors or credential URLs', async () => {
    vi.mocked(fetchFacebookPosts).mockRejectedValueOnce(new Error('secret-token-in-upstream-url'));
    const res = await createSocialEndpoint('facebook').GET(new Request('https://example.test/api/social/facebook?limit=2'));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('secret-token');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

it('returns successful data with shared CDN caching and adapts Node requests', async () => {
  vi.mocked(fetchFacebookPosts).mockResolvedValueOnce({ posts: [], source: 'facebook', status: 'success' });
  const response = await createSocialEndpoint('facebook').GET(new Request('https://example.test/api/social/facebook?limit=3'));
  expect(response.status).toBe(200);
  expect(response.headers.get('vercel-cdn-cache-control')).toContain('s-maxage=45');
  expect(response.headers.get('cache-control')).not.toContain('no-store');
  const res = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
  await createSocialEndpoint('facebook').handler({ method: 'GET', url: '/api/social/facebook?limit=3', headers: {} }, res);
  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.end.mock.calls[0][0]).status).toBe('success');
});
it('rejects non-read methods without contacting the provider', async () => {
  const calls = vi.mocked(fetchFacebookPosts).mock.calls.length;
  const res = await createSocialEndpoint('facebook').GET(new Request('https://example.test/api/social/facebook', { method: 'POST' }));
  expect(res.status).toBe(405);
  expect(fetchFacebookPosts).toHaveBeenCalledTimes(calls);
});

// Token rotation must recover immediately, even while an expired-token error is cached.
it('reloads Facebook after a token change without exposing credentials', async () => {
  const { GET } = createSocialEndpoint('facebook');
  const request = () => new Request('https://example.test/api/social/facebook?limit=4');
  vi.stubEnv('FACEBOOK_PAGE_ACCESS_TOKEN', 'expired-test-token');
  vi.mocked(fetchFacebookPosts).mockResolvedValueOnce({ posts: [], source: 'facebook', status: 'error', errorCategory: 'expired_token' });
  expect((await (await GET(request())).json()).errorCategory).toBe('expired_token');
  const calls = vi.mocked(fetchFacebookPosts).mock.calls.length;
  await GET(request());
  expect(fetchFacebookPosts).toHaveBeenCalledTimes(calls);
  vi.stubEnv('FACEBOOK_PAGE_ACCESS_TOKEN', 'replacement-test-token');
  vi.mocked(fetchFacebookPosts).mockResolvedValueOnce({ posts: [], source: 'facebook', status: 'success' });
  const response = await GET(request());
  expect((await response.json()).status).toBe('success');
  expect(fetchFacebookPosts).toHaveBeenCalledTimes(calls + 1);
  expect(JSON.stringify([...response.headers])).not.toContain('replacement-test-token');
  vi.unstubAllEnvs();
});
