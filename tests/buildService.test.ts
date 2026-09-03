import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  decodeConfig,
  encodeConfig,
  getDefaultSuspensionForRideHeight,
  normalizeEnvironmentId,
  resolveConfig,
} from '@/services/buildService';
import type { CarConfig } from '@/types';

/**
 * The share link is the only place a CarConfig crosses a trust boundary,
 * so these cover the round trip and every way the decode can be handed
 * something it did not write.
 */
describe('config share links', () => {
  it('round-trips a config unchanged', () => {
    const decoded = decodeConfig(encodeConfig(DEFAULT_CONFIG));
    expect(decoded).toEqual(DEFAULT_CONFIG);
  });

  it('round-trips a fully customised config', () => {
    const config: CarConfig = {
      paintId: 'paint-diamond-black',
      wheelId: 'wheels-borbet-a',
      exhaustId: 'exhaust-akrapovic',
      stickerId: 'alpina',
      rideHeight: -0.22,
      environmentId: 'city-night',
    };
    expect(decodeConfig(encodeConfig(config))).toEqual(config);
  });

  it.each([
    ['not base64 at all', '!!!not-base64!!!'],
    ['base64 of non-JSON', btoa('hello world')],
    ['JSON that is not a config', btoa('{"nope":true}')],
    ['a config missing rideHeight', btoa('{"paintId":"a","wheelId":"b","exhaustId":"c","stickerId":"none"}')],
    ['empty string', ''],
  ])('returns null for %s', (_label, encoded) => {
    expect(decodeConfig(encoded)).toBeNull();
  });

  it('rejects a config whose rideHeight is a string', () => {
    const encoded = btoa(
      JSON.stringify({ ...DEFAULT_CONFIG, rideHeight: '-0.1' }),
    );
    expect(decodeConfig(encoded)).toBeNull();
  });

  it('defaults the environment when an old link predates it', () => {
    const { environmentId: _omitted, ...withoutEnvironment } = DEFAULT_CONFIG;
    const decoded = decodeConfig(btoa(JSON.stringify(withoutEnvironment)));
    expect(decoded?.environmentId).toBe(DEFAULT_CONFIG.environmentId);
  });
});

describe('environment id sanitising', () => {
  it('passes through every valid id', () => {
    for (const id of ['showroom', 'city-night', 'modern-showroom', 'led-studio'] as const) {
      expect(normalizeEnvironmentId(id)).toBe(id);
    }
  });

  it('remaps retired ids instead of dropping the user somewhere random', () => {
    expect(normalizeEnvironmentId('pro-garage')).toBe('led-studio');
    expect(normalizeEnvironmentId('mountain-road')).toBe('modern-showroom');
  });

  it.each([['unknown-room'], [null], [undefined], [42], [{}]])(
    'falls back to the default for %s',
    (value) => {
      expect(normalizeEnvironmentId(value)).toBe(DEFAULT_CONFIG.environmentId);
    },
  );
});

describe('ride height → suspension product', () => {
  // Each range maps onto a real product so the build can be priced; the
  // boundaries are what decide which one a given slider position quotes.
  it.each([
    [-0.30, 'suspension-kw-v3'],
    [-0.20, 'suspension-kw-v3'],
    [-0.19, 'suspension-bilstein-b16'],
    [-0.12, 'suspension-bilstein-b16'],
    [-0.11, 'suspension-ground-control'],
    [-0.06, 'suspension-ground-control'],
    [-0.05, 'suspension-h-and-r-sport'],
    [0, 'suspension-h-and-r-sport'],
  ])('rideHeight %s → %s', (height, expected) => {
    expect(getDefaultSuspensionForRideHeight(height)?.id).toBe(expected);
  });
});

describe('resolveConfig', () => {
  it('totals the selected parts', () => {
    const summary = resolveConfig(DEFAULT_CONFIG);
    const expected =
      (summary.paint?.price ?? 0) +
      (summary.wheels?.price ?? 0) +
      (summary.exhaust?.price ?? 0) +
      (summary.sticker?.price ?? 0) +
      (summary.suspension?.price ?? 0);
    expect(summary.total).toBe(expected);
    expect(summary.total).toBeGreaterThan(0);
  });

  it('resolves every slot for the default build', () => {
    const summary = resolveConfig(DEFAULT_CONFIG);
    expect(summary.paint?.id).toBe(DEFAULT_CONFIG.paintId);
    expect(summary.wheels?.id).toBe(DEFAULT_CONFIG.wheelId);
    expect(summary.exhaust?.id).toBe(DEFAULT_CONFIG.exhaustId);
    expect(summary.suspension).toBeDefined();
  });

  it('does not throw or mis-total when a part id is unknown', () => {
    const summary = resolveConfig({ ...DEFAULT_CONFIG, paintId: 'paint-nope' });
    expect(summary.paint).toBeUndefined();
    expect(Number.isFinite(summary.total)).toBe(true);
  });
});
