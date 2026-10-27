import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchInstagramPosts, fetchYouTubePosts, fetchFacebookPosts } from '../socialApiHandler';
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
afterEach(() => vi.unstubAllEnvs());

describe('dynamic platform mapping', () => {
  it('does not fetch YouTube data without a configured channel or for another handle', async () => {
    vi.stubEnv('YOUTUBE_CHANNEL_HANDLE', '');
    await expect(fetchYouTubePosts({ apiKey: 'test' })).rejects.toThrow('YOUTUBE_CHANNEL_HANDLE');
    vi.stubEnv('YOUTUBE_CHANNEL_HANDLE', '@configured');
    await expect(fetchYouTubePosts({ apiKey: 'test', handle: '@other' })).rejects.toThrow('Only the configured');
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([[1781413, 1781413], [1799, 1799], [1, 1]])('formats Instagram followers %s as %s', async (count, expected) => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ username: 'compact', followers_count: count }))
      .mockResolvedValueOnce(response({ data: [{ id: 'compact-post', media_type: 'IMAGE' }] }));
    const result = await fetchInstagramPosts({ accessToken: 'test', userId: `compact-${count}` });
    expect(result.account?.followersCount).toBe(expected);
    expect(result.posts[0].account.followersCount).toBe(expected);
  });
  it('maps Instagram profile/media values and retains zero metrics', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ username: 'live_creator', name: 'Live Name', followers_count: 0 }))
      .mockResolvedValueOnce(response({ data: [{ id: 'live-media', caption: 'Live caption', media_type: 'IMAGE', media_url: 'https://example.test/image.jpg', permalink: 'https://www.instagram.com/p/live/', like_count: 0, comments_count: 3 }] }));
    const result = await fetchInstagramPosts({ accessToken: 'test', userId: 'dynamic-account' });
    expect(result.posts[0]).toMatchObject({ caption: 'Live caption', likesCount: '0', commentsCount: '3',
      thumbnailUrl: 'https://example.test/image.jpg', account: { displayName: 'Live Name', followersCount: 0 } });
    expect(result.account?.isVerified).toBeUndefined();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/dynamic-account?');
  });

  it('keeps missing Instagram profile/metrics absent instead of using sample data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({}, 403))
      .mockResolvedValueOnce(response({ data: [{ id: 'missing-profile', media_type: 'VIDEO' }] }));
    const result = await fetchInstagramPosts({ accessToken: 'test', userId: 'missing-account' });
    expect(result.posts[0]).toMatchObject({ caption: '', postUrl: '', thumbnailUrl: '/media-placeholder.svg' });
    expect(result.posts[0].likesCount).toBeUndefined();
    expect(result.account).toMatchObject({ handle: '', displayName: '', profileUrl: '' });
    expect(result.account?.followersCount).toBeUndefined();
    expect(result.account?.isVerified).toBeUndefined();
  });

  it('does not populate an empty Instagram feed with static posts', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ username: 'empty' })).mockResolvedValueOnce(response({ data: [] }));
    expect((await fetchInstagramPosts({ accessToken: 'test', userId: 'empty-account' })).posts).toEqual([]);
  });

  it('maps YouTube metadata from the configured channel and omits unprovided metrics', async () => {
    vi.stubEnv('YOUTUBE_CHANNEL_HANDLE', '@dynamic_channel');
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ items: [{ snippet: { title: 'Dynamic channel', customUrl: '@dynamic_channel' }, contentDetails: { relatedPlaylists: { uploads: 'uploads' } }, statistics: { subscriberCount: '17' } }] }))
      .mockResolvedValueOnce(response({ items: [{ contentDetails: { videoId: 'dynamic-video' } }] }))
      .mockResolvedValueOnce(response({ items: [{ id: 'dynamic-video', snippet: { title: 'API video title' }, statistics: { likeCount: '0' } }] }));
    const result = await fetchYouTubePosts({ apiKey: 'test' });
    expect(result.posts[0]).toMatchObject({ caption: 'API video title', likesCount: '0', account: { displayName: 'Dynamic channel', followersCount: 17 } });
    expect(result.posts[0].aspectRatio).toBeUndefined();
    expect(result.posts[0].commentsCount).toBeUndefined();
    expect(result.account?.isVerified).toBeUndefined();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('dynamic_channel');
  });

  it('loads Facebook likes without requesting comments', async () => {
    vi.mocked(fetch).mockImplementation(async input => {
      const url = new URL(String(input));
      const fields = url.searchParams.get('fields') || '';
      expect(fields).not.toContain('comments');
      if (url.pathname.endsWith('/posts')) return response({ data: [{ id: 'likes-only-post', message: 'API caption' }] });
      if (url.pathname.endsWith('/photos')) return response({ data: [] });
      if (fields.startsWith('likes.')) return response({ likes: { summary: { total_count: 0 } } });
      if (fields === 'followers_count') return response({ followers_count: 3700000 });
      if (fields === 'is_verified') return response({ is_verified: true });
      return response({ id: 'likes-only-page', name: 'API Page' });
    });
    const result = await fetchFacebookPosts({ pageId: 'likes-only-page', accessToken: 'test-likes' });
    expect(result.posts[0]).toMatchObject({ likes: 0, likesCount: '0', comments: null });
    expect(result.account).toMatchObject({ followersCount: 3700000, isVerified: true });
  });

  it('does not invent a Facebook account when credentials are absent', async () => {
    vi.stubEnv('FACEBOOK_PAGE_ID', '');
    vi.stubEnv('FACEBOOK_PAGE_ACCESS_TOKEN', '');
    const result = await fetchFacebookPosts();
    expect(result).toMatchObject({ posts: [], status: 'unconfigured' });
    expect(result.account?.profileUrl).toBe('');
    expect(result.account?.followersCount).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
