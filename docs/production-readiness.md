# Production and reusable-component notes

## Reuse without affecting the host page

Import `UnifiedSocialSlider` directly. Do not import the demo's `App.css` or `index.css` into an existing website: those are page-level demo styles. Component variables are scoped to its wrapper; keyboard navigation responds only to events within the component and ignores editable controls. Timers/listeners are removed on unmount.

Provide a distinct, stable `storageKey` for each instance, particularly on SPA routes where components may be reordered:

```tsx
<UnifiedSocialSlider title="Latest from social" storageKey="home-social" />
<UnifiedSocialSlider title="More updates" storageKey="footer-social" />
```

Without an explicit key, route and mounted instance position distinguish saved slide state. Optional `providers` adapters implement `ISocialDataProvider` for other host backends or tests. The default adapters use the same-origin `/api/social/*` routes; hosts must deploy these routes or supply their own adapters. The old optional YouTube constructor key argument is retained for source compatibility but is never sent from the browser; configure the server instead.

## Credentials and API protection

Keep `YOUTUBE_API_KEY`, `FACEBOOK_PAGE_ACCESS_TOKEN`, and `INSTAGRAM_ACCESS_TOKEN` server-side. The old `VITE_YOUTUBE_API_KEY` is accepted by the server for migration only; Vite exposes only the `PUBLIC_` prefix. No credential is required in the browser. Restrict the Google key to the YouTube Data API and rotate any previously exposed key under the organization's credential-rotation process.

Public routes accept GET/OPTIONS, integer limits from 1 to 10, the configured Facebook Page, and the configured/registered YouTube channels. Unknown/duplicate parameters and other channels are rejected. Refresh flags redirect to a bounded canonical cache URL and cannot bypass upstream freshness protection. Successful responses use Vercel's shared CDN cache (60 seconds for Facebook, 300 seconds for other feeds); warm instances additionally coalesce requests and cache results. Instance-local IP limiting is bounded to 120 requests/minute and 2048 tracked clients. This is not a distributed rate limiter: for large or hostile traffic, configure platform-level WAF limits and provider quota alerts as well. Multi-region cold instances can still make separate upstream calls.

Individual upstream requests have an eight-second deadline; the complete provider operation has a twenty-second budget. Temporary Facebook failures retain the last successful post and back off up to five minutes. An explicitly empty feed clears the old content. A successful refresh updates the newest post, author, caption, and metrics. Instagram/YouTube results are applied independently; one slow provider does not block the others.

## Release checks

Run `npm ci`, `npm test`, `npm run build`, and `npm run check:bundle`. CI performs the same checks using Node 24 and no live credentials. Tests mock network access by default. Test and build configurations are separate so testing never loads `.env` secrets.

Browser navigation uses canonical HTTPS URLs in the same tab. The slider never requests an app installation. Meta's own websites and the phone's link settings remain outside this component's control. Browser Back restores the selected slide. Desktop and mobile-width checks are supported here; physical-device verification is a separate UAT step.
