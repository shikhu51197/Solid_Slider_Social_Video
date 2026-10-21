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

  describe('YouTubeLiveDataProvider server integration', () => {
    it('returns a controlled error when the server feed fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
      const result = await new YouTubeLiveDataProvider().getPosts();
      expect(result.status).toBe('error');
      expect(result.posts).toHaveLength(0);
    });
    it('uses the server endpoint even if a caller passes an old client key', async () => {
      const posts = [{ id: 'live-video', platform: 'youtube', account: { displayName: 'Live channel' }, likesCount: '75' }];
      vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ posts }) } as Response);
      const provider = new YouTubeLiveDataProvider('@bajaj_finance_limited', 'never-send-this-key');
      const result = await provider.getPosts();
      expect(result.status).toBe('success');
      expect(result.posts).toEqual(posts);
      expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/social/youtube?handle=%40bajaj_finance_limited');
      expect(JSON.stringify(vi.mocked(fetch).mock.calls)).not.toContain('never-send-this-key');
      await provider.getPosts();
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
