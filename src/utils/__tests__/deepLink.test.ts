import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlatformDeepLink, openSocialLink } from '../deepLink';

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

  describe('openSocialLink navigation', () => {
    it('dispatches to window.open with _self by default', () => {
      const openSpy = vi.fn();
      window.open = openSpy;

      openSocialLink('https://www.instagram.com/bajajfinance__moneyadda/');

      expect(openSpy).toHaveBeenCalledWith(
        'https://www.instagram.com/bajajfinance__moneyadda/',
        '_self',
        undefined
      );
    });

    it('prefers appUrl on mobile devices', () => {
      const openSpy = vi.fn();
      window.open = openSpy;

      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      openSocialLink(
        'https://www.instagram.com/bajajfinance__moneyadda/',
        'instagram://user?username=bajajfinance__moneyadda'
      );

      expect(openSpy).toHaveBeenCalledWith(
        'instagram://user?username=bajajfinance__moneyadda',
        '_self',
        undefined
      );

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });
  });
});
