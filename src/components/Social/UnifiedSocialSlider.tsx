import { UI_TEXT } from '../../config/uiText';
import type { Component } from 'solid-js';
import { createSignal, For, onMount } from 'solid-js';
import type { ISocialDataProvider, SocialPlatform } from '../../types/social';
import { usePlatformOrder } from './hooks/usePlatformOrder';
import { SocialCardItem } from './SocialCardItem';
import { useSocialFeeds } from './hooks/useSocialFeeds';
import { useSliderGestures } from './hooks/useSliderGestures';
import './UnifiedSocialSlider.css';

export interface UnifiedSocialSliderProps {
  title?: string;
  /** Supply a stable unique key when mounting/unmounting in a SPA. */
  storageKey?: string;
  providers?: Partial<Record<SocialPlatform, ISocialDataProvider>>;
}

export const UnifiedSocialSlider: Component<UnifiedSocialSliderProps> = (props) => {
  let sectionRef: HTMLElement | undefined;
  let resolvedStorageKey = '';
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const platformOrder = usePlatformOrder();
  const feeds = useSocialFeeds(props.providers);

  onMount(() => {
    const instanceIndex = Array.from(document.querySelectorAll('[data-social-slider]')).indexOf(sectionRef!);
    resolvedStorageKey = props.storageKey || `social-slider:${window.location.pathname}:${instanceIndex}`;
    try {
      const saved = Number(sessionStorage.getItem(resolvedStorageKey));
      if (Number.isInteger(saved) && saved >= 0 && saved < platformOrder().length) setCurrentIndex(saved);
    } catch { /* Storage may be disabled by the embedding browser. */ }
  });

  const goToSlide = (index: number) => {
    const nextIndex = (index + platformOrder().length) % platformOrder().length;
    setCurrentIndex(nextIndex);
    try { sessionStorage.setItem(resolvedStorageKey, String(nextIndex)); }
    catch { /* Navigation still works when storage is disabled. */ }
  };
  const gestures = useSliderGestures(
    () => goToSlide(currentIndex() - 1),
    () => goToSlide(currentIndex() + 1),
  );

  return (
    <section ref={sectionRef} data-social-slider class="uss-page-wrapper" aria-label={props.title || UI_TEXT.heading} onKeyDown={gestures.onKeyDown}>
      <div class="uss-slider-container">
        {/* Section Heading Row */}
        <div class="uss-header-row">
          <h2 class="uss-heading">{props.title || UI_TEXT.heading}</h2>
        </div>

        {/* ── Single Slider with 3 Slides Strip ── */}
        <div
          ref={gestures.setViewport}
          class={`uss-slider-viewport ${gestures.isDragging() ? 'is-dragging' : ''}`}
          onMouseDown={gestures.onMouseDown}
          onTouchStart={gestures.onTouchStart}
          onTouchMove={gestures.onTouchMove}
          onTouchEnd={gestures.onTouchEnd}
          onTouchCancel={gestures.onTouchEnd}
        >
          <div
            class="uss-slides-strip"
            style={{
              transform: `translateX(calc(-${currentIndex() * 100}% + ${gestures.dragOffset()}px))`,
              transition: gestures.isDragging() ? 'none' : UI_TEXT.slideTransition,
            }}
          >
            <For each={platformOrder()}>
              {(platform, i) => (
                <div class="uss-slide-item">
                  <SocialCardItem
                    post={feeds()[platform].post}
                    slideIndex={i()}
                    activeSlideIndex={currentIndex()}
                    totalSlides={platformOrder().length}
                    onSelectDot={goToSlide}
                    isDragging={gestures.isDragging() || gestures.justSwiped()}
                    unavailable={feeds()[platform].unavailable}
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
