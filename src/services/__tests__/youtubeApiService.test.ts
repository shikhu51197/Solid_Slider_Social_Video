import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatMetricNumber,
  fetchYouTubeChannel,
  fetchVideosDetails,
  fetchYouTubeChannelSliderPosts,
} from '../youtubeApiService';
import { YouTubeLiveDataProvider } from '../socialDataProvider';

describe('YouTube API Service & Metrics Parser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('formatMetricNumber', () => {
    it('formats millions, thousands, and standard counts correctly', () => {
      expect(formatMetricNumber('1500000')).toBe('1.5M');
      expect(formatMetricNumber(204000)).toBe('204K');
      expect(formatMetricNumber('15420')).toBe('15.4K');
      expect(formatMetricNumber('342')).toBe('342');
      expect(formatMetricNumber(0)).toBe('0');
      expect(formatMetricNumber('0')).toBe('0');
    });

    it('returns undefined for missing or invalid metric counts', () => {
      expect(formatMetricNumber(undefined)).toBeUndefined();
      expect(formatMetricNumber(null)).toBeUndefined();
      expect(formatMetricNumber('')).toBeUndefined();
      expect(formatMetricNumber('invalid')).toBeUndefined();
    });
  });

  describe('fetchYouTubeChannel', () => {
    it('fetches channel details and derives uploads playlist ID', async () => {
      const mockChannelResponse = {
        items: [
          {
            id: 'UCTngumZeLr6bj7IJFOryd_A',
            snippet: {
              title: 'Bajaj Finance',
              customUrl: '@bajaj_finance_limited',
              description: 'Official channel of Bajaj Finance',
              thumbnails: {
                high: { url: 'https://yt3.ggpht.com/avatar.jpg' },
              },
            },
            contentDetails: {
              relatedPlaylists: {
                uploads: 'UUTngumZeLr6bj7IJFOryd_A',
              },
            },
            statistics: {
              subscriberCount: '204000',
              videoCount: '16167',
              viewCount: '276952993',
            },
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockChannelResponse,
      } as Response);

      const channel = await fetchYouTubeChannel('@bajaj_finance_limited', 'test-api-key');

      expect(channel.id).toBe('UCTngumZeLr6bj7IJFOryd_A');
      expect(channel.title).toBe('Bajaj Finance');
      expect(channel.handle).toBe('@bajaj_finance_limited');
      expect(channel.uploadsPlaylistId).toBe('UUTngumZeLr6bj7IJFOryd_A');
      expect(channel.subscriberCount).toBe('204K Subscribers');
      expect(channel.avatarUrl).toBe('https://yt3.ggpht.com/avatar.jpg');
    });

    it('throws descriptive error if channel is not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response);

      await expect(
        fetchYouTubeChannel('@non_existent_handle_123', 'test-api-key')
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('fetchVideosDetails with Resilient Metric Handling', () => {
    it('gracefully handles videos with partial or missing metrics without assuming every metric exists', async () => {
      const mockVideosResponse = {
        items: [
          {
            id: 'video-with-all-metrics',
            snippet: {
              title: 'SIP Plans for 3 Years',
              description: 'Mutual Fund analysis',
              publishedAt: '2026-10-14T00:00:00Z',
              thumbnails: { high: { url: 'https://ytimg.com/thumb1.jpg' } },
            },
            statistics: {
              viewCount: '15420',
              likeCount: '890',
              commentCount: '45',
            },
          },
          {
            id: 'video-with-missing-comments-and-likes',
            snippet: {
              title: 'Lenovo E41-55 Daily Essentials',
              description: 'Product overview',
              publishedAt: '2026-10-18T00:00:00Z',
              thumbnails: { high: { url: 'https://ytimg.com/thumb2.jpg' } },
            },
            statistics: {
              viewCount: '120',
              // likeCount and commentCount intentionally omitted by YouTube
            },
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideosResponse,
      } as Response);

      const videos = await fetchVideosDetails(['video-with-all-metrics', 'video-with-missing-comments-and-likes'], 'test-api-key');

      expect(videos).toHaveLength(2);

      // Video 1 exposes all metrics
      expect(videos[0].metrics.viewCount).toBe('15.4K');
      expect(videos[0].metrics.likeCount).toBe('890');
      expect(videos[0].metrics.commentCount).toBe('45');

      // Video 2 does not expose likes or comments - metrics must be undefined, not fabricated!
      expect(videos[1].metrics.viewCount).toBe('120');
      expect(videos[1].metrics.likeCount).toBeUndefined();
      expect(videos[1].metrics.commentCount).toBeUndefined();
    });
  });

  describe('YouTubeLiveDataProvider integration', () => {
    it('returns error when API key is missing and identifies missing configs', async () => {
      const provider = new YouTubeLiveDataProvider('@bajaj_finance_limited', '');
      const result = await provider.getPosts();

      expect(result.status).toBe('error');
      expect(result.missingIntegrationDetails).toBeDefined();
      expect(result.missingIntegrationDetails![0].platform).toBe('youtube');
    });

    it('returns live posts formatted for the Social Media Slider', async () => {
      const channelMock = {
        items: [
          {
            id: 'UCTngumZeLr6bj7IJFOryd_A',
            snippet: {
              title: 'Bajaj Finance',
              customUrl: '@bajaj_finance_limited',
              thumbnails: { high: { url: '/avatar.jpg' } },
            },
            contentDetails: {
              relatedPlaylists: { uploads: 'UUTngumZeLr6bj7IJFOryd_A' },
            },
            statistics: { subscriberCount: '204000' },
          },
        ],
      };

      const playlistMock = {
        items: [
          { contentDetails: { videoId: 'vid-1' } },
          { contentDetails: { videoId: 'vid-2' } },
        ],
      };

      const videosMock = {
        items: [
          {
            id: 'vid-1',
            snippet: {
              title: 'Test Video 1',
              thumbnails: { high: { url: '/thumb1.jpg' } },
              publishedAt: '2026-10-18T10:00:00Z',
            },
            statistics: { viewCount: '1500', likeCount: '75' },
          },
          {
            id: 'vid-2',
            snippet: {
              title: 'Test Video 2',
              thumbnails: { high: { url: '/thumb2.jpg' } },
              publishedAt: '2026-10-17T10:00:00Z',
            },
            statistics: { viewCount: '800' }, // Comments and likes hidden
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({ ok: true, json: async () => channelMock } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => playlistMock } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => videosMock } as Response);

      const provider = new YouTubeLiveDataProvider('@bajaj_finance_limited', 'dummy-key');
      const result = await provider.getPosts();

      expect(result.status).toBe('success');
      expect(result.dataSource).toBe('live-api');
      expect(result.posts).toHaveLength(2);

      const post1 = result.posts[0];
      expect(post1.account.displayName).toBe('Bajaj Finance');
      expect(post1.account.handle).toBe('@bajaj_finance_limited');
      expect(post1.account.followersCount).toBe('204K Subscribers');
      expect(post1.platform).toBe('youtube');
      expect(post1.likesCount).toBe('75');
      expect(post1.viewsCount).toBe('1.5K views');
      expect(post1.videoId).toBe('vid-1');
      expect(post1.postUrl).toBe('https://www.youtube.com/watch?v=vid-1');

      const post2 = result.posts[1];
      expect(post2.likesCount).toBeUndefined();
      expect(post2.commentsCount).toBeUndefined();
      expect(post2.viewsCount).toBe('800 views');
    });
  });
});
