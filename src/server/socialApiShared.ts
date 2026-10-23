// In-memory cache entries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL_MS = 300_000; // 5 minutes

export function getCached<T>(key: string, ttlMs = DEFAULT_CACHE_TTL_MS): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T): void {
  if (cacheStore.size >= 256) cacheStore.delete(cacheStore.keys().next().value!);
  cacheStore.set(key, { data, timestamp: Date.now() });
}

/**
 * Format raw metric numbers into human-readable strings (e.g. 1.2K, 4.4M).
 */
export function formatMetricNumber(val?: number | string | null): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const num = typeof val === 'string' ? parseInt(val, 10) : val;
  if (isNaN(num)) return undefined;

  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}K`;
  }
  return num.toLocaleString();
}
