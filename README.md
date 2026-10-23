# Solid.js Social Video Slider

Responsive Instagram, YouTube and Facebook cards with live server-side platform integrations. Card spacing, colors, icons and responsive sizing follow the supplied Figma reference.

## Run locally

Requires Node.js 22.13 or newer.

1. Run `npm install`.
2. Copy `.env.example` to `.env` and add the authorized account credentials.
3. Run `npm run dev` and open http://localhost:5173.

Credentials stay on the server. Restart the development server after changing environment variables. Configure the same variables separately in Vercel before deploying.

## Behavior

- One card per platform, in Instagram / YouTube / Facebook order.
- Live account details, thumbnails, captions, permalinks and available engagement metrics.
- Pagination, keyboard arrows, touch swipes, mouse dragging and horizontal trackpad navigation.
- Card, play and engagement clicks open the post; profile controls open the account.
- Instagram profile and post links open in the same tab on mobile and desktop, retaining the slider in browser history. Instagram controls navigation inside its own app.
- Saved slide selection is restored when returning to the page.
- The visible thumbnail loads eagerly; hidden thumbnails load lazily.
- Independent polling while visible: Facebook every minute; Instagram and YouTube every five minutes.
- Failed requests retain previously loaded real posts; explicitly empty feeds clear them. Failures offer retry inside the card layout.
- No static post catalog, simulated delays or fabricated metrics. Local SVGs serve as image/error placeholders.

UI labels, styles, platform order and refresh intervals are configuration. Social content comes from APIs. The server resolves Instagram/Facebook accounts from credentials and YouTube from `YOUTUBE_CHANNEL_HANDLE`.

## Structure

```text
src/
  components/Social/
    UnifiedSocialSlider.tsx       Slider host and saved selection
    SocialCardItem.tsx            Card and pagination
    Icons.tsx                     Shared SVG icons
    UnifiedSocialSlider.css       Scoped responsive styles
    hooks/useSocialFeeds.ts       Feed lifecycle, polling and retry
    hooks/useSliderGestures.ts    Mouse, touch, wheel and keyboard input
  config/social.ts                Platform labels, order and intervals
  services/socialDataProvider.ts  Shared API adapter, validation and TTL cache
  server/
    socialEndpoint.ts             Request validation, caching and hosting adapter
    socialApiHandler.ts           Server API exports
    instagramApi.ts               Instagram profile/media mapping
    youtubeApi.ts                 YouTube channel/video mapping
    facebookApi.ts                Facebook posts/photos and diagnostics
    platformTypes.ts              Upstream response types
    socialApiShared.ts            Bounded cache and metric formatting
    upstreamFetch.ts              Upstream timeouts
  types/social.ts                 Domain models
  utils/                          Navigation, selection and fetch helpers
api/social/                       Production endpoints
```

## Reuse

```tsx
import { UnifiedSocialSlider } from './components/Social/UnifiedSocialSlider';

<UnifiedSocialSlider title="Latest from social" storageKey="home-social" />
```

Use a distinct, stable `storageKey` per instance. Supply optional `providers` implementing `ISocialDataProvider` for another backend. Deploy the same-origin API routes for the default adapter. Avoid importing page-level `App.css` or `index.css` into a host website.

## Checks

```bash
npm test
npm run build
npm run check:bundle
```

The build includes strict TypeScript and unused-code checks. Tests mock upstream APIs without private credentials. The bundle check verifies configured credentials are absent from generated client JavaScript.

## Facebook token troubleshooting

Local and Vercel credentials are separate. A Git push does not synchronize them. Update `FACEBOOK_PAGE_ACCESS_TOKEN` in the affected environment with the matching `FACEBOOK_PAGE_ID`, then restart locally or redeploy on Vercel.

`/api/social/facebook?diagnostic=true` checks the configured Page and content endpoints. The app does not implement unattended OAuth renewal. See `docs/production-readiness.md` for caching and hosting details.
