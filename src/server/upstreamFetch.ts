import { AsyncLocalStorage } from 'node:async_hooks';
import { fetchWithTimeout } from '../utils/http.js';

const requestSignals = new AsyncLocalStorage<AbortSignal>();
/** A bounded total budget includes metadata and per-post requests, not just one fetch. */
export async function withUpstreamBudget<T>(load: () => Promise<T>, timeoutMs = 20_000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Social provider deadline exceeded'));
    }, timeoutMs);
  });
  try { return await Promise.race([requestSignals.run(controller.signal, load), expired]); }
  finally { clearTimeout(timer!); }
}
export function fetchUpstream(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestSignal = requestSignals.getStore();
  const signal = requestSignal && init.signal ? AbortSignal.any([requestSignal, init.signal]) : requestSignal || init.signal;
  return fetchWithTimeout(input, { ...init, signal });
}
