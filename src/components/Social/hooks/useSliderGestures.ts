import { createSignal, onCleanup, onMount } from 'solid-js';

/** Mouse, touch, trackpad and keyboard navigation scoped to one slider. */
export function useSliderGestures(previous: () => void, next: () => void) {
  const [dragOffset, setDragOffset] = createSignal(0);
  const [isDragging, setIsDragging] = createSignal(false);
  const [justSwiped, setJustSwiped] = createSignal(false);

  let viewportRef: HTMLDivElement | undefined;
  let disposed = false;
  onCleanup(() => { disposed = true; });
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
        next();
      } else {
        previous();
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
        next();
      } else {
        previous();
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (e.defaultPrevented || target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'ArrowLeft') previous();
    else next();
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

  return {
    dragOffset, isDragging, justSwiped, onMouseDown, onTouchStart, onTouchMove,
    onTouchEnd, onKeyDown, setViewport: (element: HTMLDivElement) => { viewportRef = element; }
  };
}
