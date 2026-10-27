import { expect, it, vi } from 'vitest';
import { fetchUpstream, withUpstreamBudget } from '../upstreamFetch';
it('bounds the whole provider operation even if one operation never settles', async () => {
  await expect(withUpstreamBudget(() => new Promise(() => {}), 10)).rejects.toThrow('deadline');
});
it('propagates the provider deadline to its upstream fetches', async () => {
  let signal: AbortSignal | undefined;
  vi.mocked(fetch).mockImplementation((_input, init) => {
    signal = init?.signal as AbortSignal;
    return new Promise((_resolve, reject) => signal!.addEventListener('abort', () => reject(new Error('aborted'))));
  });
  await expect(withUpstreamBudget(() => fetchUpstream('https://example.test'), 10)).rejects.toThrow();
  expect(signal?.aborted).toBe(true);
});
