/** Version-controlled operational defaults, independent of feed TTL. */
export const RUNTIME = {
  requestTimeoutMs: 8_000, clientTimeoutMs: 25_000, upstreamTimeoutMs: 20_000,
  retryInitialMs: 30_000, retryMaxMs: 300_000, retryExponentMax: 4,
  maxCacheEntries: 256, rateRequests: 120, rateWindowMs: 60_000, rateEntries: 2048,
  errorCacheMs: 5_000, staleSeconds: 30,
};
export const GESTURES = { swipePx: 40, velocity: 0.35, flickPx: 20, dragPx: 6, suppressMs: 100, wheelPx: 18, wheelThrottleMs: 420 };
