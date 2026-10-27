import { afterEach, expect, it, vi } from 'vitest';
import { parseSocialCacheTtl } from '../../config/cacheTtl';
import { getCached, setCached } from '../socialApiShared';

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

it('validates the configured duration', () => {
  expect(parseSocialCacheTtl('45000')).toBe(45000);
  for (const value of [undefined, '', 'bad', '0', '-1', '999', 'Infinity']) {
    expect(parseSocialCacheTtl(value)).toBe(300000);
  }
});

it('expires cached API data at the env duration', () => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_SOCIAL_CACHE_TTL_MS', '2000');
  setCached('env-duration-test', { value: 'live' });
  vi.advanceTimersByTime(1999);
  expect(getCached('env-duration-test')).toEqual({ value: 'live' });
  vi.advanceTimersByTime(1);
  expect(getCached('env-duration-test')).toBeNull();
});
