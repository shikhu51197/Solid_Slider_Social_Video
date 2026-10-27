import { expect, it } from 'vitest';
import { formatFollowers } from '../formatFollowers';
it('formats live numeric platform counts without overstating them', () => {
  expect(formatFollowers(1781413, 'instagram')).toBe('1.7M Followers');
  expect(formatFollowers(3683721, 'facebook')).toBe('3.7M Followers');
  expect(formatFollowers(204000, 'youtube')).toBe('204K Subscribers');
  expect(formatFollowers(0, 'instagram')).toBe('0 Followers');
  expect(formatFollowers(undefined, 'facebook')).toBeUndefined();
});
