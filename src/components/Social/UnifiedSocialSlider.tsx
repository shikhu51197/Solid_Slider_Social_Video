import type { Component } from 'solid-js';
import {
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import type { SocialPost, ISocialDataProvider, SocialDataResult } from '../../types/social';
import { selectLatestFacebookPost } from '../../utils/facebookFeed';
import {
  InstagramLiveDataProvider,
  YouTubeLiveDataProvider,
  FacebookLiveDataProvider,
} from '../../services/socialDataProvider';
import { formatLikes, openSocialLink } from '../../utils/deepLink';
import {
  BookmarkIcon,
  CenterPlayButton,
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
      handle: 'facebook', displayName: 'Facebook Page',
      profileUrl: 'https://www.facebook.com/', avatarUrl: '/facebook-logo.svg',
    },
    caption: '', thumbnailUrl: '/media-placeholder.svg', postUrl: '',
    postType: 'unknown', aspectRatio: 'square',
  },
];

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
      openSocialLink(props.post.postUrl);
    }
  };

  const handleProfileClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.isDragging) return;
    if (props.post.account.profileUrl) {
      openSocialLink(props.post.account.profileUrl);
    }
  };

  const isVideo = () =>
    props.post.postType === 'video' ||
    props.post.postType === 'reel' ||
    props.post.postType === 'short' ||
    Boolean(props.post.videoId) ||
    props.post.platform === 'youtube';

  return (
    <div class="uss-post-layout">
    <div class="uss-card" onClick={handleCardClick} role="link" tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`${props.post.account.displayName}: ${props.post.caption || props.post.title || 'View post'}`}
    >
      {/* 1. Profile Header */}
      <header class="uss-card-header">
        <a class="uss-account-meta uss-profile-link" href={props.post.account.profileUrl} onClick={(e) => { e.preventDefault(); handleProfileClick(e); }} title="View profile">
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
              <Show when={props.post.account.isVerified || props.post.platform === 'facebook'}>
                <VerifiedBadge size={15} />
              </Show>
            </div>
            <Show when={props.post.account.followersCount}>
              <span class="uss-followers">{props.post.account.followersCount}</span>
            </Show>
          </div>
        </a>

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
                classList={{ 'uss-media-fill': props.post.platform === 'instagram' || props.post.platform === 'facebook' }}
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

      </div>

      {/* 3. Card Footer */}
      <footer class="uss-card-footer" classList={{ 'uss-facebook-footer': props.post.platform === 'facebook' }}>
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
              <HeartIcon size={20} />
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
              <CommentIcon size={20} />
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
              <ShareIcon size={20} />
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
            <BookmarkIcon size={20} />
          </button>
        </div>

        {/* Real Engagement Metrics (Only when returned and permitted) */}
        <div class="uss-metrics">
        <Show when={props.post.platform === 'facebook'}>
          <div class="uss-likes-count" aria-live="polite">
            {props.post.likesCount !== undefined
              ? formatLikes(props.post.likesCount)
              : 'Likes unavailable'}
          </div>
          {/* <div class="uss-views-count">{props.post.viewsCount !== undefined ? `${props.post.viewsCount} Views` : 'Views unavailable'}</div> */}
        </Show>
        <Show when={props.post.platform !== 'facebook'}>
        <Show when={props.post.likesCount}>
          <div class="uss-likes-count">
            {formatLikes(props.post.likesCount!)}
          </div>
        </Show>

        {/* <Show when={props.post.viewsCount}>
          <div class="uss-views-count">
            {props.post.viewsCount}
          </div>
        </Show> */}

        </Show>
        </div>

        {/* Caption */}
        <div class="uss-caption" classList={{ 'uss-facebook-caption': props.post.platform === 'facebook' }}>
          <Show when={props.post.platform === 'facebook'} fallback={<>
            <a class="uss-caption-author uss-profile-link" href={props.post.account.profileUrl} onClick={(e) => { e.preventDefault(); handleProfileClick(e); }}>{props.post.account.displayName}</a>{' '}
            {props.post.caption || props.post.title || ''}
          </>}>
            <a class="uss-caption-author uss-profile-link" href={props.post.account.profileUrl} onClick={(e) => { e.preventDefault(); handleProfileClick(e); }}>{props.post.account.displayName}</a>{' '}
            <span>{props.post.description || props.post.caption || props.post.title || ''}</span>
          </Show>
        </div>
        {/* Horizontal Divider Line matching Reference */}
        <div class="uss-divider" />

        {/* Platform link — navigates in same tab */}
        <div class="uss-view-more-row">
          <Show when={props.post.platform !== 'facebook' || Boolean(props.post.postUrl)}>
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
          </Show>
        </div>

      </footer>
    </div>
        {/* Pagination sits below the bordered post in the Figma variant. */}
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
    </div>
  );
};

// ─── Unified Social Slider Main Component ──────────────────────────────────────
export interface UnifiedSocialSliderProps {
  title?: string;
  subtitle?: string;
  /** Supply a stable unique key when mounting/unmounting in a SPA. */
  storageKey?: string;
  /** Optional adapters keep the component usable in other hosts and tests. */
  providers?: Partial<Record<'instagram' | 'youtube' | 'facebook', ISocialDataProvider>>;
}

export const UnifiedSocialSlider: Component<UnifiedSocialSliderProps> = (props) => {
  let sectionRef: HTMLElement | undefined;
  let resolvedStorageKey = '';
  let disposed = false;
  onCleanup(() => { disposed = true; });
  const [currentIndex, setCurrentIndex] = createSignal(0);

  // Per-platform data states
  const [igPost, setIgPost] = createSignal<SocialPost>(DEFAULT_SLIDES[0]);
  const [ytPost, setYtPost] = createSignal<SocialPost>(DEFAULT_SLIDES[1]);
  const [fbPost, setFbPost] = createSignal<SocialPost>(DEFAULT_SLIDES[2]);
  const applyFacebookPosts = (posts: SocialPost[]) => {
    const latest = selectLatestFacebookPost(posts);
    if (latest && !disposed) setFbPost(latest);
  };
  const [fbUnavailable, setFbUnavailable] = createSignal<{
    isUnavailable: boolean;
    category?: string;
    badge?: string;
    title?: string;
    message?: string;
    onRetry?: () => void;
  } | null>(null);

  const igProvider = props.providers?.instagram || new InstagramLiveDataProvider('/api/social/instagram', 300);
  const ytProvider = props.providers?.youtube || new YouTubeLiveDataProvider('@bajaj_finance_limited');
  const fbProvider = props.providers?.facebook || new FacebookLiveDataProvider('/api/social/facebook', 60);
  let facebookRequest: Promise<void> | undefined;
  let failures = 0;
  let nextRetryAt = 0;

  const refreshFacebook = (force = false): Promise<void> => {
    if (facebookRequest) return facebookRequest;
    if (disposed || (!force && Date.now() < nextRetryAt)) return Promise.resolve();
    facebookRequest = (async () => {
      try {
        const result = await fbProvider.getPosts(force);
        if (disposed) return;
        if (result.status === 'success' && result.posts.length) {
          applyFacebookPosts(result.posts);
          setFbUnavailable(null);
          failures = 0;
          nextRetryAt = 0;
        } else {
          handleFacebookFailure(result);
        }
      } catch {
        if (!disposed) handleFacebookFailure({ posts: [], status: 'error', dataSource: 'none', errorCategory: 'network_error' });
      }
    })().finally(() => { facebookRequest = undefined; });
    return facebookRequest;
  };

  const handleFacebookFailure = (result: SocialDataResult) => {
    failures++;
    nextRetryAt = Date.now() + Math.min(300_000, 30_000 * 2 ** Math.min(failures - 1, 4));
    // A temporary outage must not discard a successfully loaded public post.
    if (fbPost().postUrl && result.status !== 'empty') return;
    if (result.status === 'empty') setFbPost(DEFAULT_SLIDES[2]);
    if (result.account) setFbPost(prev => ({ ...prev, account: result.account! }));
    setFbUnavailable({ isUnavailable: true, category: result.errorCategory,
      title: 'Facebook Content Unavailable', badge: 'Unavailable',
      message: 'Unable to load Facebook posts. Please try again shortly.',
      onRetry: () => { void refreshFacebook(true); } });
  };

  const refreshAll = () => {
    // Apply each result as it arrives; one slow provider cannot block the others.
    for (const [provider, update] of [[igProvider, setIgPost], [ytProvider, setYtPost]] as const) {
      void provider.getPosts().then(result => {
        if (!disposed && result.status === 'success' && result.posts.length) update(result.posts[0]);
      }).catch(() => { /* Keep the last successfully rendered post. */ });
    }
    void refreshFacebook();
  };

  onMount(() => {
    const instanceIndex = Array.from(document.querySelectorAll('[data-social-slider]')).indexOf(sectionRef!);
    resolvedStorageKey = props.storageKey || `social-slider:${window.location.pathname}:${instanceIndex}`;
    try {
      const saved = Number(sessionStorage.getItem(resolvedStorageKey));
      if (Number.isInteger(saved) && saved >= 0 && saved <= 2) setCurrentIndex(saved);
    } catch { /* Storage may be disabled by the embedding browser. */ }
    refreshAll();
    const facebookInterval = setInterval(() => {
      if (!document.hidden) void refreshFacebook();
    }, 60_000);
    const pollInterval = setInterval(() => {
      if (!document.hidden) refreshAll();
    }, 300_000);
    const refreshWhenVisible = () => {
      if (!document.hidden) void refreshFacebook();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('pageshow', refreshWhenVisible);
    onCleanup(() => {
      clearInterval(facebookInterval);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('pageshow', refreshWhenVisible);
    });
  });

  const slides = () => [igPost(), ytPost(), fbPost()];

  // Persist current slide index in sessionStorage for browser Back navigation
  const goToSlide = (idx: number) => {
    if (idx < 0) idx = 2;
    if (idx > 2) idx = 0;
    setCurrentIndex(idx);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(resolvedStorageKey, String(idx));
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

  let swipeTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(swipeTimer));

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
    clearTimeout(swipeTimer);
    swipeTimer = setTimeout(() => { if (!disposed) setJustSwiped(false); }, 100);
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
    const target = e.target as HTMLElement;
    if (e.defaultPrevented || target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'ArrowLeft') handlePrev();
    else handleNext();
  };

  onMount(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    if (viewportRef) viewportRef.addEventListener('wheel', onWheel, { passive: false });
    onCleanup(() => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (viewportRef) viewportRef.removeEventListener('wheel', onWheel);
    });
  });

  return (
    <section ref={sectionRef} data-social-slider class="uss-page-wrapper" aria-label={props.title || 'Latest from social'} onKeyDown={onKeyDown}>
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
