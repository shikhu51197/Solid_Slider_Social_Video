/// <reference lib="dom" />
/**
 * Platform deep linking and universal link resolution utilities.
 * Provides fallback to canonical web permalinks across devices.
 */

import type { SocialPlatform } from '../types/social.js';

export function getPlatformDeepLink(platform: SocialPlatform, targetUrl: string): string | undefined {
  if (!targetUrl) return undefined;

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  switch (platform) {
    case 'instagram': {
      // 1. Post / Reel permalink (e.g., /p/CODE/ or /reel/CODE/)
      const postMatch = targetUrl.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/);
      if (postMatch && postMatch[1]) {
        const shortcode = postMatch[1];
        if (isAndroid) {
          return `intent://instagram.com/p/${shortcode}/#Intent;package=com.instagram.android;scheme=https;end`;
        }
        return `instagram://media?id=${shortcode}`;
      }

      // 2. Profile permalink (e.g., /bajajfinance__moneyadda/ or @username)
      const userMatch = targetUrl.match(/instagram\.com\/([^/?#]+)/);
      const username = userMatch ? userMatch[1] : targetUrl.replace(/^@/, '');
      if (username && !['p', 'reel', 'tv', 'stories', 'explore'].includes(username)) {
        if (isAndroid) {
          return `intent://instagram.com/_u/${username}/#Intent;package=com.instagram.android;scheme=https;end`;
        }
        return `instagram://user?username=${username}`;
      }

      return undefined;
    }
    case 'youtube': {
      // 1. Video / Short ID
      const ytMatch = targetUrl.match(/(?:shorts\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        if (isAndroid) {
          return `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;end`;
        }
        return `vnd.youtube://${videoId}`;
      }

      // 2. Channel / Profile
      const channelMatch = targetUrl.match(/youtube\.com\/(@?[a-zA-Z0-9_-]+)/);
      if (channelMatch && channelMatch[1]) {
        const channelName = channelMatch[1];
        if (isAndroid) {
          return `intent://www.youtube.com/${channelName}#Intent;package=com.google.android.youtube;scheme=https;end`;
        }
        return `vnd.youtube://user/${channelName.replace(/^@/, '')}`;
      }

      return undefined;
    }
    case 'facebook': {
      return `fb://facewebmodal/f?href=${encodeURIComponent(targetUrl)}`;
    }
    default:
      return undefined;
  }
}

/**
 * Dispatches navigation to a social link.
 * Uses same-tab navigation by default, retaining the slider in browser history.
 * Navigation inside a platform's native app is controlled by that app.
 */
export function openSocialLink(
  webUrl: string,
  _appUrl?: string,
  target: '_self' | '_blank' = '_self'
): void {
  if (!webUrl) return;

  // Canonical HTTPS links support OS universal/app links and remain usable
  // when no app is installed. Custom schemes can strand users without a fallback.
  const targetUrl = webUrl;

  if (target === '_self') {
    window.location.assign(targetUrl);
    return;
  }
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

export function formatLikes(value: string | number): string {
  const count = String(value).trim().replace(/\s*likes?$/i, '').trim();
  return `${count} Likes`;
}
