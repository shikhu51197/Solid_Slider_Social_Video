import { createSignal, onCleanup, onMount } from 'solid-js';
import { PLATFORM_ORDER } from '../../../config/social';
import { parsePlatformOrder } from '../../../config/platformOrder';
import { fetchWithTimeout } from '../../../utils/http';
import type { SocialPlatform } from '../../../types/social';

/** Reload editable public configuration without restarting the app. */
export function usePlatformOrder() {
  const [order, setOrder] = createSignal<readonly SocialPlatform[]>(PLATFORM_ORDER);
  const controller = new AbortController();
  let pending = false;
  const refresh = async () => {
    if (pending || controller.signal.aborted || document.hidden) return;
    pending = true;
    try {
      const response = await fetchWithTimeout(`${import.meta.env.BASE_URL || '/'}social-config.json`, {
        cache: 'no-store', signal: controller.signal,
      }, 5000);
      if (!response.ok) return;
      const config: unknown = await response.json();
      if (!config || typeof config !== 'object' || !('platformOrder' in config) ||
          !Array.isArray(config.platformOrder) || !config.platformOrder.length ||
          !config.platformOrder.every(platform => typeof platform === 'string' && platform.trim() !== '')) return;
      const next = parsePlatformOrder(config.platformOrder.join(','));
      if (!controller.signal.aborted && next.join(',') !== order().join(',')) setOrder(next);
    } catch { /* Retain the last valid sequence on invalid config or network failure. */ }
    finally { pending = false; }
  };
  onMount(() => {
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30_000);
    const onReturn = () => { void refresh(); };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('pageshow', onReturn);
    onCleanup(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('pageshow', onReturn);
    });
  });
  onCleanup(() => controller.abort());
  return order;
}
