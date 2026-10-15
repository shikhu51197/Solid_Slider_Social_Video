# Solid.js Social Media Slider

A high-fidelity, responsive **Social Media Slider** component built with **Solid.js**, TypeScript, and Vanilla CSS, matching the reference design specification and accommodating official Bajaj Finance channel data.

## Features

- **Pixel-Perfect Reference Alignment**: Light grey page background, heading "Latest from social", large white card with rounded corners (`16px`), subtle border, and box-shadow.
- **Rich Profile Header**: Account avatar, username, verified checkmark badge, follower count, and primary "View profile" button.
- **Media Presentation**: Aspect-ratio preserving container with `object-fit: cover` that handles portrait, square, and landscape thumbnails without distortion.
- **Overlaid Circular Navigation**: Circular Previous/Next arrow buttons overlaid on the media.
- **Interactive Engagement Row**: Accessible Like, Comment, Share, and Bookmark icons, plus actual like counts (never fabricated).
- **Caption & Truncation**: Bold author handle, caption text with clean multi-line clamping and ellipsis.
- **Platform-Adaptive Links**: Dynamic "View more on Instagram", "View more on Facebook", and "View more on YouTube" links.
- **Pagination**: Centered pagination dots indicating slide count and current active slide.
- **Navigation & Gestures**:
  - Previous / Next circular buttons
  - Clickable pagination dots
  - Touch swipe gestures (left/right) on mobile
  - Keyboard navigation (`ArrowLeft` / `ArrowRight`)
  - Clickable card redirection (thumbnail, caption, engagement, and "View more" open the specific post permalink)
  - Isolated "View profile" button click (opens the profile without triggering post URL)
- **Framework-Independent Data Layer**: Reusable domain models (`src/types/social.ts`) and data providers (`src/services/socialDataProvider.ts`) easily portable to React or Next.js.
- **Robust Error & Metric Handling**: Loading skeleton, empty state, error state with retry, and missing-metric resilience.

---

## Official Channel Data

Uses the authorized official Bajaj Finance channel handles supplied by the business team:
- **Instagram**: `bajajfinance__emihaina` (B2B, DEEL, Bajaj Mall)
- **Facebook**: `bajajfinance` (Bajaj Finance - All Businesses)
- **YouTube**: `Bajaj Finance Money Adda` (`@BajajFinanceMoneyAdda` - Investment)
- **YouTube**: `Bajaj Finance` (`@bajaj_finance_limited` - All Businesses)

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Unit & Integration Tests
```bash
npm test
```

### 4. Build for Production
```bash
npm run build
```

---

## Architecture

```
src/
├── types/
│   └── social.ts               # Framework-independent domain interfaces & data provider types
├── services/
│   ├── socialDataProvider.ts   # Official Bajaj Finance catalog provider & Live API provider
│   └── __tests__/
│       └── socialDataProvider.test.ts
├── components/
│   └── SocialSlider/
│       ├── Icons.tsx           # Scalable SVG icons (Verified badge, Chevrons, Engagement)
│       ├── PaginationDots.tsx  # Accessible pagination dots
│       ├── SocialCard.tsx      # Core card component matching Figma reference
│       ├── SocialMediaSlider.tsx # Slider container with touch swipe & keyboard navigation
│       ├── SocialMediaSlider.css # Vanilla CSS design system & responsive media queries
│       ├── StateViews.tsx      # Skeleton loader, Empty state, and Error state with retry
│       └── __tests__/
│           ├── SocialCard.test.tsx
│           └── SocialMediaSlider.test.tsx
├── App.tsx                     # Demo host with interactive state switcher toolbar
├── index.css                   # Global reset and typography tokens
└── index.tsx                   # Solid.js root entrypoint
```
