import { describe, expect, it } from 'vitest';
import { parsePlatformOrder } from './platformOrder';

describe('parsePlatformOrder', () => {
  it('uses the existing sequence when unset or blank', () => {
    for (const value of [undefined, '', '  ']) {
      expect(parsePlatformOrder(value)).toEqual(['instagram', 'youtube', 'facebook']);
    }
  });

  it('preserves the configured sequence and trims whitespace', () => {
    expect(parsePlatformOrder(' youtube, facebook ,instagram ')).toEqual(['youtube', 'facebook', 'instagram']);
  });

  it.each(['youtube,facebook', 'youtube,youtube,instagram', 'youtube,tiktok,instagram', 'youtube,facebook,instagram,'])('rejects invalid configuration: %s', value => {
    expect(() => parsePlatformOrder(value)).toThrow('platformOrder');
  });
});
