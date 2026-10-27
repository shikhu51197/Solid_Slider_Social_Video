import type {} from '@testing-library/jest-dom/vitest';
import { beforeEach, expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// Tests must never contact social platforms or depend on local credentials.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network disabled in tests')));
});
