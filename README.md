# Solid.js Social Video Slider

Responsive Instagram, YouTube and Facebook cards with live server-side platform integrations. Card spacing, colors, icons and responsive sizing follow the supplied Figma reference.

## Run locally

Requires Node.js 22.19 or newer.

1. Run `npm install`.
2. Copy `.env.example` to `.env` and add the authorized account credentials.
3. Run `npm run dev` and open http://localhost:5173.

Credentials stay on the server. Restart the development server after changing environment variables. Configure the same variables separately in Vercel before deploying.

The development command uses the operating system's trusted certificate store so API requests work on networks with a trusted corporate HTTPS certificate. Certificate verification remains enabled.

## Behavior

- One card per platform, ordered by `public/social-config.json` (default: Instagram / YouTube / Facebook).
- Live account details, thumbnails, captions, permalinks and available engagement metrics.
- Pagination, keyboard arrows, touch swipes, mouse dragging and horizontal trackpad navigation.
- Card, play and engagement clicks open the post; profile controls open the account.
- Instagram profile and post links open in the same tab on mobile and desktop, retaining the slider in browser history. Instagram controls navigation inside its own app.
- Saved slide selection is restored when returning to the page.
- The visible thumbnail loads eagerly; hidden thumbnails load lazily.
- Independent polling while visible, using `VITE_SOCIAL_CACHE_TTL_MS` for all platforms and API caches (default: 300000 milliseconds). Restart development / rebuild the client after changing this setting; configure it on the deployment server as well.
- Failed requests retain previously loaded real posts; explicitly empty feeds clear them. Failures offer retry inside the card layout.
- No static post catalog, simulated delays or fabricated metrics. Local SVGs serve as image/error placeholders.

Edit `public/social-config.json` to change the card sequence without restarting or rebuilding locally:

```json
{ "platformOrder": ["youtube", "facebook", "instagram"] }
```

Include `instagram`, `youtube` and `facebook` exactly once. Open sliders check the file every 30 seconds while visible and when returning to the page, using uncached requests. The current slide position stays selected as the cards reorder. Invalid configuration or failed requests retain the last valid sequence; until configuration loads, the default order is used.

For production, update the served `/social-config.json` independently of the application bundle (for example through mutable hosting or a CMS endpoint at that path), and disable CDN caching for it. Vercel's bundled static files are immutable per deployment: editing the repository file there still requires deployment. Changing `.env` does not change the runtime sequence. Adding a new platform still requires its API integration and UI support.

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

## Data and operational configuration

- Require server-side `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`, `YOUTUBE_CHANNEL_HANDLE` and `YOUTUBE_API_KEY`. Legacy `VITE_YOUTUBE_API_KEY` is no longer read.
- `account.followersCount` is an optional raw number. The UI formats Instagram and YouTube compact counts with truncation and Facebook with rounding; localized native-app labels may differ.
- Verification badges use API metadata when available. The configured Instagram and YouTube brand handles have explicit design badges in `src/config/social.ts`; other accounts receive no assumed badge, and explicit API false takes precedence.
- Facebook requests likes separately without fetching comments. Missing access leaves likes unavailable, never zero. Read permissions still depend on the Meta app and Page token.
- Operational defaults and gesture thresholds live in `src/config/runtime.ts`, shared UI copy in `src/config/uiText.ts`, and platform API versions in `src/server/apiConfig.ts`. CSS design tokens remain unchanged.
