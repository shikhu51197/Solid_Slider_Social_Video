import type { Component } from 'solid-js';
import {
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import type { SocialPost } from '../../types/social';
import {
  InstagramLiveDataProvider,
  YouTubeLiveDataProvider,
  FacebookLiveDataProvider,
} from '../../services/socialDataProvider';
import { getPlatformDeepLink, openSocialLink } from '../../utils/deepLink';
import {
  BookmarkIcon,
  CenterPlayButton,
  ChevronLeftIcon,
  ChevronRightIcon,
  CommentIcon,
  HeartIcon,
  ShareIcon,
  VerifiedBadge,
  FacebookIcon,
} from '../SocialSlider/Icons';
import './UnifiedSocialSlider.css';

// ─── Default authentic fallback posts matching reference UI ───────────────────
const DEFAULT_SLIDES: SocialPost[] = [
  {
    id: 'slide-instagram',
    platform: 'instagram',
    account: {
      handle: '@hey_learningstar',
      displayName: 'The_Great_life',
      profileUrl: 'https://www.instagram.com/hey_learningstar/',
      avatarUrl: '/bajaj-emihaina-avatar.png',
      followersCount: '2 Followers',
      isVerified: true,
      businessCategory: 'Creator Account',
    },
    caption: 'Paise save karne hain ya invest? FD aur mutual funds dono popular options hain, lekin dono ka...',
    thumbnailUrl: '/bajaj-instagram-reel.jpg',
    postUrl: 'https://www.instagram.com/p/DBI1ZlSSwR9/',
    postType: 'reel',
    aspectRatio: 'portrait',
    likesCount: '4,447 Likes',
    commentsCount: '128',
    publishedAt: '2026-10-14',
  },
  {
    id: 'slide-youtube',
    platform: 'youtube',
    account: {
      handle: '@bajaj_finance_limited',
      displayName: 'Bajaj Finance Limited',
      profileUrl: 'https://www.youtube.com/@bajaj_finance_limited',
      avatarUrl: '/bajaj-finserv-logo.png',
      followersCount: '204K Subscribers',
      isVerified: true,
      businessCategory: 'Official Channel',
    },
    caption: 'SIP Plans for 3 Years: Investment Options, Risks and Selection with Bajaj Finance Money Adda.',
    thumbnailUrl: '/youtube-sip-thumbnail.jpg',
    postUrl: 'https://www.youtube.com/watch?v=IE1HNML-FKg',
    videoId: 'IE1HNML-FKg',
    postType: 'video',
    aspectRatio: 'landscape',
    likesCount: '15,420 Likes',
    commentsCount: '890',
    viewsCount: '24.5K views',
    publishedAt: '2026-10-14',
  },
  {
    id: 'slide-facebook',
    platform: 'facebook',
    account: {
      handle: 'bajaj.finance.in',
      displayName: 'Bajaj Finance Limited',
      profileUrl: 'https://www.facebook.com/bajaj.finance.in/',
      avatarUrl: '/bajaj-finserv-logo.png',
      followersCount: '1.2M Followers',
      isVerified: true,
      businessCategory: 'Official Page',
    },
    caption: 'Smart savings options designed for your future goals. Discover fixed deposit rates and flexible plans.',
    thumbnailUrl: '/bajaj-emihaina-thumbnail.jpg',
    postUrl: 'https://www.facebook.com/bajaj.finance.in/',
    postType: 'image',
    aspectRatio: 'square',
    likesCount: '8,920 Likes',
    commentsCount: '412',
    publishedAt: '2026-10-14',
  },
];

// Helper to format uppercase publish date matching reference: "PUBLISHED OCT 14, 2026"
function formatPublishDate(isoDate?: string): string {
  if (!isoDate) return 'PUBLISHED OCT 14, 2026';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return 'PUBLISHED OCT 14, 2026';
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.getDate();
    const year = d.getFullYear();
    return `PUBLISHED ${month} ${day}, ${year}`;
  } catch {
    return 'PUBLISHED OCT 14, 2026';
  }
}

// ─── Single Social Card Component (Matching Reference UI exactly) ──────────────
interface SocialCardItemProps {
  post: SocialPost;
  slideIndex: number;
  activeSlideIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectDot: (index: number) => void;
  isDragging: boolean;
  unavailable?: {
    isUnavailable: boolean;
    category?: string;
    badge?: string;
    title?: string;
    message?: string;
    onRetry?: () => void;
  } | null;
}

const SocialCardItem: Component<SocialCardItemProps> = (props) => {
  // Navigate in the SAME tab so browser back returns to original page
  const handleCardClick = () => {
    if (props.isDragging) return;
    if (props.post.postUrl) {
      openSocialLink(props.post.postUrl, props.post.deepLinkUrl, '_self');
    }
  };

  const handleProfileClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.isDragging) return;
    if (props.post.account.profileUrl) {
      const appUrl = getPlatformDeepLink(props.post.platform, props.post.account.profileUrl);
      openSocialLink(props.post.account.profileUrl, appUrl, '_self');
    }
  };

  const isVideo = () =>
    props.post.postType === 'video' ||
    props.post.postType === 'reel' ||
    props.post.postType === 'short' ||
    Boolean(props.post.videoId) ||
    props.post.platform === 'youtube';

  return (
    <div class="uss-card" onClick={handleCardClick} role="link" tabIndex={0}
      aria-label={`${props.post.account.displayName}: ${props.post.caption || props.post.title || 'View post'}`}
    >
      {/* 1. Profile Header */}
      <header class="uss-card-header">
        <div class="uss-account-meta" onClick={handleProfileClick} title="View profile">
          <div class="uss-avatar-container">
            <img
              src={props.post.account.avatarUrl || '/bajaj-finserv-logo.png'}
              alt={`${props.post.account.displayName} avatar`}
              class="uss-avatar"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.onerror = null;
                img.src = props.post.platform === 'facebook' ? '/facebook-logo.svg' : '/favicon.svg';
              }}
            />
          </div>
          <div class="uss-account-info">
            <div class="uss-username-row">
              <span class="uss-username">{props.post.account.displayName}</span>
              <Show when={props.post.account.isVerified}>
                <VerifiedBadge size={15} />
              </Show>
            </div>
            <Show when={props.post.account.followersCount}>
              <span class="uss-followers">{props.post.account.followersCount}</span>
            </Show>
          </div>
        </div>

        <button
          type="button"
          class="uss-view-profile-btn"
          aria-label={`View ${props.post.account.displayName}'s profile`}
          onClick={handleProfileClick}
        >
          View profile
        </button>
      </header>

      {/* 2. Media Area with Overlaid Circular Arrows & Center Play Button */}
      <div class="uss-media-container">
        <Show
          when={props.unavailable?.isUnavailable}
          fallback={
            <>
              <img
                src={props.post.thumbnailUrl || '/media-placeholder.svg'}
                alt={props.post.caption || 'Post media'}
                class="uss-media-thumbnail cover"
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/media-placeholder.svg';
                }}
              />

              {/* Center Play Button Overlay — plays only in respective application or browser */}
              <Show when={isVideo()}>
                <CenterPlayButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick();
                  }}
                />
              </Show>
            </>
          }
        >
          {/* Requirement 7 & 8: Unavailable State with Retry Option */}
          <div class="uss-unavailable-state" onClick={(e) => e.stopPropagation()}>
            <div class="uss-unavailable-icon-wrapper">
              <FacebookIcon size={34} />
            </div>
            <div class="uss-unavailable-badge">
              {props.unavailable?.badge || 'Unavailable'}
            </div>
            <div class="uss-unavailable-title">
              {props.unavailable?.title || 'Facebook Content Unavailable'}
            </div>
            <div class="uss-unavailable-desc">
              {props.unavailable?.message || 'Unable to connect to Facebook Graph API.'}
            </div>
            <button
              type="button"
              class="uss-unavailable-retry-btn"
              onClick={(e) => {
                e.stopPropagation();
                props.unavailable?.onRetry?.();
              }}
            >
              <span class="uss-retry-icon">↻</span> Retry Connection
            </button>
          </div>
        </Show>

        {/* Previous Slide Arrow Overlay (circular white button on media) */}
        <button
          type="button"
          class="uss-nav-arrow uss-nav-prev"
          aria-label="Previous slide"
          onClick={(e) => {
            e.stopPropagation();
            props.onPrev();
          }}
        >
          <ChevronLeftIcon size={20} />
        </button>

        {/* Next Slide Arrow Overlay (circular white button on media) */}
        <button
          type="button"
          class="uss-nav-arrow uss-nav-next"
          aria-label="Next slide"
          onClick={(e) => {
            e.stopPropagation();
            props.onNext();
          }}
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>

      {/* 3. Card Footer */}
      <footer class="uss-card-footer">
        {/* Engagement Row: Heart, Comment, Share on left, Bookmark on right */}
        <div class="uss-engagement-row">
          <div class="uss-actions-left">
            <button
              type="button"
              class="uss-icon-btn"
              aria-label="Like post"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <HeartIcon size={24} />
            </button>
            <button
              type="button"
              class="uss-icon-btn"
              aria-label="Comment on post"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <CommentIcon size={24} />
            </button>
            <button
              type="button"
              class="uss-icon-btn"
              aria-label="Share post"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <ShareIcon size={24} />
            </button>
          </div>

          <button
            type="button"
            class="uss-icon-btn uss-bookmark-btn"
            aria-label="Bookmark post"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
          >
            <BookmarkIcon size={24} />
          </button>
        </div>

        {/* Real Engagement Metrics (Only when returned and permitted) */}
        <div class="uss-metrics">
        <Show when={props.post.likesCount}>
          <div class="uss-likes-count">
            {props.post.likesCount}
          </div>
        </Show>

        <Show when={props.post.viewsCount}>
          <div class="uss-views-count">
            {props.post.viewsCount}
          </div>
        </Show>

        </div>

        {/* Caption */}
        <div class="uss-caption">
          <span class="uss-caption-author">{props.post.account.displayName}</span>{' '}
          {props.post.caption || props.post.title || ''}
        </div>

        {/* Horizontal Divider Line matching Reference */}
        <div class="uss-divider" />

        {/* Platform link — navigates in same tab */}
        <div class="uss-view-more-row">
          <a
            href={props.post.postUrl}
            class="uss-view-more-link"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCardClick();
            }}
          >
            {props.post.platform === 'youtube'
              ? 'View more on YouTube'
              : props.post.platform === 'facebook'
                ? 'View more on Facebook'
                : 'View more on instagram'}
          </a>
        </div>

        {/* Publish Date */}
        <div class="uss-publish-date">
          {formatPublishDate(props.post.publishedAt)}
        </div>

        {/* 3 Pagination Dots */}
        <div class="uss-dots-container" role="tablist" aria-label="Social slides pagination" onClick={(e) => e.stopPropagation()}>
          <For each={[0, 1, 2]}>
            {(idx) => (
              <button
                type="button"
                role="tab"
                aria-selected={idx === props.activeSlideIndex}
                aria-label={`Slide ${idx + 1} of 3`}
                class={`uss-dot ${idx === props.activeSlideIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onSelectDot(idx);
                }}
              />
            )}
          </For>
        </div>
      </footer>
    </div>
  );
};

// ─── Unified Social Slider Main Component ──────────────────────────────────────
export interface UnifiedSocialSliderProps {
  title?: string;
  subtitle?: string;
}

export const UnifiedSocialSlider: Component<UnifiedSocialSliderProps> = (props) => {
  // Restore saved slide index on browser Back navigation
  const getInitialIndex = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const saved = sessionStorage.getItem('social_slider_current_index');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 2) return parsed;
        }
      }
    } catch { }
    return 0;
  };

  // Current Slide Index: 0 = Instagram, 1 = YouTube, 2 = Facebook
  const [currentIndex, setCurrentIndex] = createSignal(getInitialIndex());

  // Per-platform data states
  const [igPost, setIgPost] = createSignal<SocialPost>(DEFAULT_SLIDES[0]);
  const [ytPost, setYtPost] = createSignal<SocialPost>(DEFAULT_SLIDES[1]);
  const [fbPost, setFbPost] = createSignal<SocialPost>(DEFAULT_SLIDES[2]);
  const [fbUnavailable, setFbUnavailable] = createSignal<{
    isUnavailable: boolean;
    category?: string;
    badge?: string;
    title?: string;
    message?: string;
    onRetry?: () => void;
  } | null>(null);

  // Data providers with 5-minute (300s) caching
  const igProvider = new InstagramLiveDataProvider('/api/social/instagram', 300);
  const ytProvider = new YouTubeLiveDataProvider('@bajaj_finance_limited');
  const fbProvider = new FacebookLiveDataProvider('/api/social/facebook', 300);

  const refreshAll = async (force = false) => {
    try {
      // Promise.allSettled guarantees that if one platform fails, the others continue working
      const [igRes, ytRes, fbRes] = await Promise.allSettled([
        igProvider.getPosts(force),
        ytProvider.getPosts(force),
        fbProvider.getPosts(force),
      ]);

      if (igRes.status === 'fulfilled' && igRes.value.posts?.length > 0) {
        setIgPost(igRes.value.posts[0]);
      }
      if (ytRes.status === 'fulfilled' && ytRes.value.posts?.length > 0) {
        setYtPost(ytRes.value.posts[0]);
      }
      if (fbRes.status === 'fulfilled') {
        const val = fbRes.value;
        if (val.status === 'success' && val.posts?.length > 0) {
          setFbPost(val.posts[0]);
          setFbUnavailable(null);
        } else {
          if (val.account) {
            setFbPost((prev) => ({ ...prev, account: val.account! }));
          }
          const cat = val.errorCategory || 'unknown';
          let title = 'Facebook Content Unavailable';
          let badge = 'Unavailable';
          let message = val.errorMessage || 'Unable to connect to Facebook Graph API.';

          if (cat === 'expired_token') {
            title = 'Session Expired';
            badge = 'Token Expired';
            message = 'Facebook Page access token has expired. Please refresh FACEBOOK_PAGE_ACCESS_TOKEN in .env.';
          } else if (cat === 'missing_permissions') {
            title = 'Permissions Required';
            badge = 'Missing Scope';
            message = 'Facebook Page access token requires pages_read_engagement and pages_read_user_content.';
          } else if (cat === 'rate_limited') {
            title = 'Rate Limit Reached';
            badge = 'Rate Limited';
            message = 'Meta Graph API request limit reached. Please wait a moment before trying again.';
          } else if (cat === 'network_error') {
            title = 'Connection Offline';
            badge = 'Network Error';
            message = 'Unable to reach Facebook Graph API. Please check internet connectivity.';
          } else if (cat === 'empty_results') {
            title = 'No Posts Found';
            badge = 'Empty Feed';
            message = 'Connected to Facebook Page, but no public posts or photos were found.';
          } else if (cat === 'unconfigured') {
            title = 'Not Configured';
            badge = 'Configuration';
            message = 'Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in .env to connect your Page.';
          }

          setFbUnavailable({
            isUnavailable: true,
            category: cat,
            badge,
            title,
            message,
            onRetry: () => refreshAll(true),
          });
        }
      }
    } catch {
      // fallback preserved
    }
  };

  onMount(() => {
    refreshAll(false);

    // Optional 5-minute poll interval to keep feeds updated automatically
    const pollInterval = setInterval(() => {
      refreshAll(false);
    }, 300_000);

    onCleanup(() => clearInterval(pollInterval));
  });

  const slides = () => [igPost(), ytPost(), fbPost()];

  // Persist current slide index in sessionStorage for browser Back navigation
  const goToSlide = (idx: number) => {
    if (idx < 0) idx = 2;
    if (idx > 2) idx = 0;
    setCurrentIndex(idx);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('social_slider_current_index', String(idx));
      }
    } catch { }
  };

  const handlePrev = () => goToSlide(currentIndex() - 1);
  const handleNext = () => goToSlide(currentIndex() + 1);

  // ── Swipe, Drag, and Wheel Scroll Gesture Handling ──
  const [dragOffset, setDragOffset] = createSignal(0);
  const [isDragging, setIsDragging] = createSignal(false);
  const [justSwiped, setJustSwiped] = createSignal(false);

  let viewportRef: HTMLDivElement | undefined;
  let isPointerDown = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerStartTime = 0;

  const commitSwipe = (diffX: number) => {
    const elapsed = Date.now() - pointerStartTime + 1;
    const vel = Math.abs(diffX) / elapsed;

    if (Math.abs(diffX) > 40 || (vel > 0.35 && Math.abs(diffX) > 20)) {
      if (diffX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setIsDragging(false);
    setDragOffset(0);
    setTimeout(() => setJustSwiped(false), 100);
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, iframe, input')) return;
    isPointerDown = true;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    pointerStartTime = Date.now();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isPointerDown) return;
    const dx = e.clientX - pointerStartX;
    const dy = e.clientY - pointerStartY;
    if (!isDragging() && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      setIsDragging(true);
      setJustSwiped(true);
    }
    if (isDragging()) {
      setDragOffset(dx);
    }
  };

  const onMouseUp = () => {
    if (!isPointerDown) return;
    isPointerDown = false;
    if (isDragging()) commitSwipe(dragOffset());
  };

  let touchStartX = 0, touchStartY = 0, isTouchActive = false;

  const onTouchStart = (e: TouchEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest('button, a, iframe, input')) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    pointerStartTime = Date.now();
    isTouchActive = true;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isTouchActive) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (!isDragging() && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      setIsDragging(true);
      setJustSwiped(true);
    }
    if (isDragging()) {
      if (e.cancelable) e.preventDefault();
      setDragOffset(dx);
    }
  };

  const onTouchEnd = () => {
    if (!isTouchActive) return;
    isTouchActive = false;
    if (isDragging()) commitSwipe(dragOffset());
  };

  let lastWheelTime = 0;
  const onWheel = (e: WheelEvent) => {
    const ax = Math.abs(e.deltaX), ay = Math.abs(e.deltaY);
    if (ax > ay && ax > 18) {
      if (e.cancelable) e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime < 420) return;
      lastWheelTime = now;
      if (e.deltaX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    else if (e.key === 'ArrowRight') handleNext();
  };

  onMount(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    if (viewportRef) viewportRef.addEventListener('wheel', onWheel, { passive: false });
    onCleanup(() => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      if (viewportRef) viewportRef.removeEventListener('wheel', onWheel);
    });
  });

  return (
    <section class="uss-page-wrapper" aria-label="Latest from social">
      <div class="uss-slider-container">
        {/* Section Heading Row */}
        <div class="uss-header-row">
          <h2 class="uss-heading">{props.title || 'Latest from social'}</h2>
        </div>

        {/* ── Single Slider with 3 Slides Strip ── */}
        <div
          ref={viewportRef}
          class={`uss-slider-viewport ${isDragging() ? 'is-dragging' : ''}`}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <div
            class="uss-slides-strip"
            style={{
              transform: `translateX(calc(-${currentIndex() * 100}% + ${dragOffset()}px))`,
              transition: isDragging() ? 'none' : 'transform 0.38s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <For each={slides()}>
              {(post, i) => (
                <div class="uss-slide-item">
                  <SocialCardItem
                    post={post}
                    slideIndex={i()}
                    activeSlideIndex={currentIndex()}
                    totalSlides={3}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onSelectDot={goToSlide}
                    isDragging={isDragging() || justSwiped()}
                    unavailable={i() === 2 ? fbUnavailable() : null}
                  />
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UnifiedSocialSlider;
