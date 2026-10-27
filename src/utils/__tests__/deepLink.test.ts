import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatLikes, getPlatformDeepLink, openSocialLink } from '../deepLink';

describe('deepLink utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Instagram deep link & intent resolution', () => {
    it('generates profile deep link for iOS', () => {
      // Default jsdom userAgent is not Android
      const link = getPlatformDeepLink('instagram', 'https://www.instagram.com/bajajfinance__moneyadda/');
      expect(link).toBe('instagram://user?username=bajajfinance__moneyadda');
    });

    it('generates Android intent for profile when userAgent is Android', () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
        configurable: true,
      });

      const link = getPlatformDeepLink('instagram', 'https://www.instagram.com/bajajfinance__moneyadda/');
      expect(link).toBe('intent://instagram.com/_u/bajajfinance__moneyadda/#Intent;package=com.instagram.android;scheme=https;end');

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('generates post/reel deep link for Android intent and iOS', () => {
      const iosLink = getPlatformDeepLink('instagram', 'https://www.instagram.com/p/DeexDdAjtRN/');
      expect(iosLink).toBe('instagram://media?id=DeexDdAjtRN');

      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36',
        configurable: true,
      });

      const androidLink = getPlatformDeepLink('instagram', 'https://www.instagram.com/reel/DeexDdAjtRN/');
      expect(androidLink).toBe('intent://instagram.com/p/DeexDdAjtRN/#Intent;package=com.instagram.android;scheme=https;end');

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });
  });

  describe('YouTube deep link & intent resolution', () => {
    it('generates channel deep link', () => {
      const link = getPlatformDeepLink('youtube', 'https://www.youtube.com/@BajajFinanceMoneyAdda');
      expect(link).toBe('vnd.youtube://user/BajajFinanceMoneyAdda');
    });

    it('generates video deep link', () => {
      const link = getPlatformDeepLink('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(link).toBe('vnd.youtube://dQw4w9WgXcQ');
    });
  });

  describe('browser navigation', () => {
    it.each(['Android 14', 'iPhone OS 18_0'])('opens Instagram profiles and posts in the same tab on %s', (userAgent) => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
      const assign = vi.fn();
      const open = vi.fn();
      vi.stubGlobal('window', { location: { assign }, open });
      try {
        for (const path of ['example_profile/', 'p/example/', 'reel/example/']) {
          const url = `https://www.instagram.com/${path}`;
          openSocialLink(url);
          expect(assign).toHaveBeenLastCalledWith(url);
        }
        expect(open).not.toHaveBeenCalled();
        openSocialLink('https://www.facebook.com/example');
        expect(assign).toHaveBeenCalledWith('https://www.facebook.com/example');
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('uses the HTTPS destination even when an app link is supplied', () => {
      const originalWindow = window;
      const assign = vi.fn();
      vi.stubGlobal('window', { location: { assign } });
      try {
        for (const platform of ['instagram', 'facebook', 'youtube']) {
          const url = `https://www.${platform}.com/example`;
          openSocialLink(url, `${platform}://example`);
          expect(assign).toHaveBeenLastCalledWith(url);
        }
      } finally {
        vi.stubGlobal('window', originalWindow);
      }
    });
  });

  it('uses Likes consistently without duplicating existing labels', () => {
    expect(formatLikes(1)).toBe('1 Likes');
    expect(formatLikes('1 Likes')).toBe('1 Likes');
    expect(formatLikes(0)).toBe('0 Likes');
    expect(formatLikes('4,447 Likes')).toBe('4,447 Likes');
  });
});
