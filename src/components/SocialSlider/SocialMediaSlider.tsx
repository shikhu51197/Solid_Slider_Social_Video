import type { Component } from 'solid-js';
import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Switch,
  Match,
} from 'solid-js';
import type { ISocialDataProvider, SocialDataResult, SocialPost } from '../../types/social';
import { createSocialDataProvider } from '../../services/socialDataProvider';
import { SocialCard } from './SocialCard';
import { EmptyState, ErrorState, LoadingSkeleton } from './StateViews';
import './SocialMediaSlider.css';

export interface SocialMediaSliderProps {
  heading?: string;
  dataProvider?: ISocialDataProvider;
  onSlideChange?: (index: number, post: SocialPost) => void;
  class?: string;
  allowInlinePlayback?: boolean;
  storageKey?: string;
}

export const SocialMediaSlider: Component<SocialMediaSliderProps> = (props) => {
  const [dataResult, setDataResult] = createSignal<SocialDataResult>({
    posts: [],
    status: 'loading',
    dataSource: 'official-catalog',
  });
  let wrapperRef: HTMLElement | undefined;
  let resolvedStorageKey = '';
  let swipeTimeout: ReturnType<typeof setTimeout> | undefined;
  const [currentIndex, setCurrentIndex] = createSignal(0);

  createEffect(() => {
    // Reset to first slide when data provider changes
    props.dataProvider;
    setCurrentIndex(0);
  });

  createEffect(() => {
    try {
      if (resolvedStorageKey && typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(resolvedStorageKey, String(currentIndex()));
      }
    } catch {}
  });


  const [reloadTrigger, setReloadTrigger] = createSignal(0);

  const provider = () => props.dataProvider || createSocialDataProvider('live');

  const loadData = () => {
    setReloadTrigger((n) => n + 1);
  };

  createEffect(() => {
    const currentProvider = provider();
    reloadTrigger(); // track manual reloads
    let isCancelled = false;

    setDataResult((prev) => ({ ...prev, status: 'loading' }));

    currentProvider
      .getPosts()
      .then((result) => {
        if (!isCancelled) {
          setDataResult(result);
          try {
            const saved = sessionStorage.getItem(resolvedStorageKey);
            if (saved !== null) {
              const parsed = parseInt(saved, 10);
              if (!isNaN(parsed) && parsed >= 0 && parsed < result.posts.length) {
                setCurrentIndex(parsed);
                return;
              }
            }
          } catch {}
          if (result.posts.length > 0 && currentIndex() >= result.posts.length) {
            setCurrentIndex(0);
          }
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setDataResult({
            posts: [],
            status: 'error',
            errorMessage: err instanceof Error ? err.message : 'Failed to retrieve social data',
            dataSource: 'none',
          });
        }
      });

    onCleanup(() => {
      isCancelled = true;
    });
  });

  const posts = () => dataResult().posts;
  const currentPost = () => posts()[currentIndex()];

  // Swipe, Drag & Scroll Gesture Signals
  const [dragOffset, setDragOffset] = createSignal(0);
  const [isDragging, setIsDragging] = createSignal(false);
  const [slideDirection, setSlideDirection] = createSignal<'next' | 'prev' | 'none'>('none');
  const [isAnimating, setIsAnimating] = createSignal(false);
  const [justSwiped, setJustSwiped] = createSignal(false);

  let sliderTrackRef: HTMLDivElement | undefined;
  let animTimeout: ReturnType<typeof setTimeout> | undefined;

  const triggerAnimation = (dir: 'next' | 'prev') => {
    setSlideDirection(dir);
    setIsAnimating(true);
    if (animTimeout) clearTimeout(animTimeout);
    animTimeout = setTimeout(() => {
      setIsAnimating(false);
    }, 280);
  };

  const handleNext = () => {
    const list = posts();
    if (list.length <= 1) return;
    triggerAnimation('next');
    const nextIdx = (currentIndex() + 1) % list.length;
    setCurrentIndex(nextIdx);
    props.onSlideChange?.(nextIdx, list[nextIdx]);
  };

  const handlePrev = () => {
    const list = posts();
    if (list.length <= 1) return;
    triggerAnimation('prev');
    const prevIdx = (currentIndex() - 1 + list.length) % list.length;
    setCurrentIndex(prevIdx);
    props.onSlideChange?.(prevIdx, list[prevIdx]);
  };

  const handleSelectIndex = (index: number) => {
    const list = posts();
    if (index >= 0 && index < list.length && index !== currentIndex()) {
      triggerAnimation(index > currentIndex() ? 'next' : 'prev');
      setCurrentIndex(index);
      props.onSlideChange?.(index, list[index]);
    }
  };

  // Keyboard navigation
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (e.defaultPrevented || target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  // Mouse Drag Gestures (Desktop swipe)
  let isPointerDown = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerStartTime = 0;

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, iframe, input')) return;

    isPointerDown = true;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    pointerStartTime = Date.now();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPointerDown) return;
    const diffX = e.clientX - pointerStartX;
    const diffY = e.clientY - pointerStartY;

    if (!isDragging() && Math.abs(diffX) > 6 && Math.abs(diffX) > Math.abs(diffY)) {
      setIsDragging(true);
      setJustSwiped(true);
    }

    if (isDragging()) {
      if (posts().length <= 1) {
        setDragOffset(diffX * 0.25);
      } else {
        setDragOffset(diffX);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (isDragging()) {
      const diffX = dragOffset();
      const elapsed = Date.now() - pointerStartTime;
      const velocity = Math.abs(diffX) / (elapsed || 1);

      if (Math.abs(diffX) > 40 || (velocity > 0.35 && Math.abs(diffX) > 20)) {
        if (diffX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
      setIsDragging(false);
      setDragOffset(0);
      clearTimeout(swipeTimeout);
      swipeTimeout = setTimeout(() => setJustSwiped(false), 80);
    }
  };

  // Touch swipe gestures (Mobile swipe)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isTouchActive = false;

  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, iframe, input')) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isTouchActive = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isTouchActive) return;
    const curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;
    const diffX = curX - touchStartX;
    const diffY = curY - touchStartY;

    if (!isDragging() && Math.abs(diffX) > 6 && Math.abs(diffX) > Math.abs(diffY)) {
      setIsDragging(true);
      setJustSwiped(true);
    }

    if (isDragging()) {
      if (e.cancelable) e.preventDefault();
      if (posts().length <= 1) {
        setDragOffset(diffX * 0.25);
      } else {
        setDragOffset(diffX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isTouchActive) return;
    isTouchActive = false;

    if (isDragging()) {
      const diffX = dragOffset();
      const elapsed = Date.now() - touchStartTime;
      const velocity = Math.abs(diffX) / (elapsed || 1);

      if (Math.abs(diffX) > 40 || (velocity > 0.35 && Math.abs(diffX) > 20)) {
        if (diffX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
      setIsDragging(false);
      setDragOffset(0);
      clearTimeout(swipeTimeout);
      swipeTimeout = setTimeout(() => setJustSwiped(false), 80);
    }
  };

  // Wheel / Trackpad horizontal scroll gestures
  let lastWheelTime = 0;
  const handleWheel = (e: WheelEvent) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);

    if (absX > absY && absX > 18) {
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

  onMount(() => {
    const instanceIndex = Array.from(document.querySelectorAll('[data-legacy-social-slider]')).indexOf(wrapperRef!);
    resolvedStorageKey = props.storageKey || `social-slider-legacy:${window.location.pathname}:${instanceIndex}`;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const trackEl = sliderTrackRef;
    if (trackEl) {
      trackEl.addEventListener('wheel', handleWheel, { passive: false });
    }

    // Support browser Back button bfcache navigation restore
    const handleHistoryRestore = () => {
      try {
        const saved = sessionStorage.getItem(resolvedStorageKey);
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          const currentPosts = posts();
          if (!isNaN(parsed) && parsed >= 0 && (currentPosts.length === 0 || parsed < currentPosts.length)) {
            setCurrentIndex(parsed);
          }
        }
      } catch {}
    };

    handleHistoryRestore();
    window.addEventListener('pageshow', handleHistoryRestore);
    window.addEventListener('popstate', handleHistoryRestore);

    onCleanup(() => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (trackEl) {
        trackEl.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('pageshow', handleHistoryRestore);
      window.removeEventListener('popstate', handleHistoryRestore);
      if (animTimeout) clearTimeout(animTimeout);
      clearTimeout(swipeTimeout);
    });
  });

  return (
    <section
      ref={wrapperRef}
      data-legacy-social-slider
      onKeyDown={handleGlobalKeyDown}
      class={`social-slider-wrapper ${props.class || ''}`}
      aria-roledescription="carousel"
      aria-label={props.heading || 'Latest from social'}
    >
      <div class="social-header-row">
        <h2 class="social-heading">{props.heading || 'Latest from social'}</h2>
      </div>

      <div
        ref={sliderTrackRef}
        class={`social-slider-track ${isDragging() ? 'is-dragging' : ''} ${
          isAnimating() ? `slide-enter-${slideDirection()}` : ''
        }`}
        style={{
          transform: `translateX(${dragOffset()}px)`,
          transition: isDragging() ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <Switch>
          <Match when={dataResult().status === 'loading'}>
            <LoadingSkeleton />
          </Match>

          <Match when={dataResult().status === 'error'}>
            <ErrorState
              message={dataResult().errorMessage}
              missingIntegrations={dataResult().missingIntegrationDetails}
              onRetry={loadData}
            />
          </Match>

          <Match when={dataResult().status === 'empty' || posts().length === 0}>
            <EmptyState onRetry={loadData} />
          </Match>

          <Match when={dataResult().status === 'success' && currentPost()}>
            <SocialCard
              post={currentPost()!}
              totalSlides={posts().length}
              currentIndex={currentIndex()}
              onPrev={handlePrev}
              onNext={handleNext}
              onSelectIndex={handleSelectIndex}
              allowInlinePlayback={props.allowInlinePlayback ?? true}
              isDragging={isDragging() || justSwiped()}
            />
          </Match>
        </Switch>
      </div>
    </section>
  );
};
export default SocialMediaSlider;
