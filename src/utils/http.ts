/** Bound external requests using AbortController, including older mobile browsers. */
export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs);
  try { return await globalThis.fetch(input, { ...init, signal: controller.signal }); }
  finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}
