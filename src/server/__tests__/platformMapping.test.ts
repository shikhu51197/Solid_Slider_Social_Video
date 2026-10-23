import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchInstagramPosts, fetchYouTubePosts, fetchFacebookPosts } from '../socialApiHandler';
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
afterEach(() => vi.unstubAllEnvs());

describe('dynamic platform mapping', () => {
  it('maps Instagram profile/media values and retains zero metrics', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ username: 'live_creator', name: 'Live Name', followers_count: 0 }))
      .mockResolvedValueOnce(response({ data: [{ id: 'live-media', caption: 'Live caption', media_type: 'IMAGE', media_url: 'https://example.test/image.jpg', permalink: 'https://www.instagram.com/p/live/', like_count: 0, comments_count: 3 }] }));
    const result = await fetchInstagramPosts({ accessToken: 'test', userId: 'dynamic-account' });
    expect(result.posts[0]).toMatchObject({ caption: 'Live caption', likesCount: '0', commentsCount: '3',
      thumbnailUrl: 'https://example.test/image.jpg', account: { displayName: 'Live Name', followersCount: '0 Followers' } });
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
    expect(result.posts[0]).toMatchObject({ caption: 'API video title', likesCount: '0', account: { displayName: 'Dynamic channel', followersCount: '17 Subscribers' } });
    expect(result.posts[0].commentsCount).toBeUndefined();
    expect(result.account?.isVerified).toBeUndefined();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('dynamic_channel');
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
