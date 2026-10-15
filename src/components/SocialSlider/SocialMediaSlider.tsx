import type { Component } from 'solid-js';
import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
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
}

export const SocialMediaSlider: Component<SocialMediaSliderProps> = (props) => {
  const [dataResult, setDataResult] = createSignal<SocialDataResult>({
    posts: [],
    status: 'loading',
    dataSource: 'official-catalog',
  });
  // Restore saved slide index on browser Back navigation
  const getInitialIndex = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const saved = sessionStorage.getItem('social_slider_current_index');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 0) return parsed;
        }
      }
    } catch {}
    return 0;
  };

  const [currentIndex, setCurrentIndex] = createSignal(getInitialIndex());

  createEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('social_slider_current_index', String(currentIndex()));
      }
    } catch {}
  });

  // Touch gesture state
  let touchStartX = 0;
  let touchStartY = 0;

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
            const saved = sessionStorage.getItem('social_slider_current_index');
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

  const handleNext = () => {
    const list = posts();
    if (list.length <= 1) return;
    const nextIdx = (currentIndex() + 1) % list.length;
    setCurrentIndex(nextIdx);
    props.onSlideChange?.(nextIdx, list[nextIdx]);
  };

  const handlePrev = () => {
    const list = posts();
    if (list.length <= 1) return;
    const prevIdx = (currentIndex() - 1 + list.length) % list.length;
    setCurrentIndex(prevIdx);
    props.onSlideChange?.(prevIdx, list[prevIdx]);
  };

  const handleSelectIndex = (index: number) => {
    const list = posts();
    if (index >= 0 && index < list.length) {
      setCurrentIndex(index);
      props.onSlideChange?.(index, list[index]);
    }
  };

  // Keyboard navigation
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);

    // Support browser Back button bfcache navigation restore
    const handleHistoryRestore = () => {
      try {
        const saved = sessionStorage.getItem('social_slider_current_index');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          const currentPosts = posts();
          if (!isNaN(parsed) && parsed >= 0 && (currentPosts.length === 0 || parsed < currentPosts.length)) {
            setCurrentIndex(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener('pageshow', handleHistoryRestore);
    window.addEventListener('popstate', handleHistoryRestore);

    onCleanup(() => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('pageshow', handleHistoryRestore);
      window.removeEventListener('popstate', handleHistoryRestore);
    });
  });

  // Touch swipe gestures
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Minimum swipe threshold 40px and predominantly horizontal
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  return (
    <section
      class={`social-slider-wrapper ${props.class || ''}`}
      aria-roledescription="carousel"
      aria-label={props.heading || 'Latest from social'}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div class="social-header-row">
        <h2 class="social-heading">{props.heading || 'Latest from social'}</h2>
        <Show when={dataResult().dataSource === 'cached'}>
          <div class="social-header-meta">
            <span class="social-refresh-indicator" title="Cached to respect platform API rate limits">
              Cached (5m TTL)
            </span>
          </div>
        </Show>
      </div>

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
          />
        </Match>
      </Switch>
    </section>
  );
};
export default SocialMediaSlider;
