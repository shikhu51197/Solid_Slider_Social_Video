/// <reference lib="dom" />
/**
 * Platform deep linking and universal link resolution utilities.
 * Provides fallback to canonical web permalinks across devices.
 */

import type { SocialPlatform } from '../types/social';

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
 * Defaults to navigating on the same page (_self) so that browser back button
 * returns directly to the original slider page, while supporting _blank when requested.
 */
export function openSocialLink(
  webUrl: string,
  appUrl?: string,
  target: '_self' | '_blank' = '_self'
): void {
  if (!webUrl) return;

  const targetUrl = appUrl && /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? appUrl : webUrl;

  try {
    const win = window.open(
      targetUrl,
      target,
      target === '_blank' ? 'noopener,noreferrer' : undefined
    );
    if (!win && typeof window.location.assign === 'function') {
      window.location.assign(targetUrl);
    }
  } catch {
    try {
      window.location.assign(targetUrl);
    } catch {
      window.location.href = targetUrl;
    }
  }
}
