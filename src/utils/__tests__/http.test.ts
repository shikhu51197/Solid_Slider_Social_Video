import { afterEach, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from '../http';
afterEach(() => vi.unstubAllGlobals());
it('passes a deadline signal and aborts slow requests', async () => {
  vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  })));
  await expect(fetchWithTimeout('https://example.test', {}, 10)).rejects.toThrow();
});
it('honors caller cancellation as well as the timeout', async () => {
  const caller = new AbortController();
  vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('cancelled')));
  })));
  const pending = fetchWithTimeout('https://example.test', { signal: caller.signal });
  caller.abort();
  await expect(pending).rejects.toThrow('cancelled');
});
