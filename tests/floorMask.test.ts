import { describe, expect, it } from 'vitest';
import {
  FLOOR_MASK_SIZE,
  createFloorMaskData,
  floorMaskAlphaAt,
} from '@/configurator/environments/floorMask';

/**
 * The floor mask replaced a KTX2 file with arithmetic, so the shape of
 * the gradient is now code and belongs under test. It is what stops the
 * reflective floor from ending in a visible rectangular edge.
 */
describe('floorMaskAlphaAt', () => {
  const size = 64;

  it('is fully opaque at the centre', () => {
    expect(floorMaskAlphaAt(size / 2, size / 2, size)).toBe(255);
  });

  it('is fully transparent in the corners', () => {
    expect(floorMaskAlphaAt(0, 0, size)).toBe(0);
    expect(floorMaskAlphaAt(size - 1, size - 1, size)).toBe(0);
    expect(floorMaskAlphaAt(0, size - 1, size)).toBe(0);
  });

  it('falls off monotonically from the centre outward', () => {
    const mid = size / 2;
    const walk = Array.from({ length: mid }, (_, i) =>
      floorMaskAlphaAt(mid + i, mid, size),
    );
    for (let i = 1; i < walk.length; i++) {
      expect(walk[i]).toBeLessThanOrEqual(walk[i - 1]);
    }
    expect(walk[0]).toBe(255);
    expect(walk[walk.length - 1]).toBe(0);
  });

  it('is radially symmetric', () => {
    const mid = size / 2;
    const right = floorMaskAlphaAt(mid + 10, mid, size);
    const left = floorMaskAlphaAt(mid - 11, mid, size);
    const down = floorMaskAlphaAt(mid, mid + 10, size);
    expect(left).toBe(right);
    expect(down).toBe(right);
  });

  it('stays within byte range at every texel', () => {
    for (let y = 0; y < size; y += 7) {
      for (let x = 0; x < size; x += 7) {
        const v = floorMaskAlphaAt(x, y, size);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
        expect(Number.isInteger(v)).toBe(true);
      }
    }
  });
});

describe('createFloorMaskData', () => {
  it('produces one RGBA quad per texel', () => {
    const size = 32;
    expect(createFloorMaskData(size)).toHaveLength(size * size * 4);
  });

  it('writes the value into every channel', () => {
    // three reads `.g` for alphaMap and roughnessMap, so a red-only
    // texture would sample as zero in either slot.
    const size = 32;
    const data = createFloorMaskData(size);
    const centre = ((size / 2) * size + size / 2) * 4;
    expect([...data.slice(centre, centre + 4)]).toEqual([255, 255, 255, 255]);
    expect([...data.slice(0, 4)]).toEqual([0, 0, 0, 0]);
  });

  it('defaults to the size the scene uses', () => {
    expect(createFloorMaskData()).toHaveLength(
      FLOOR_MASK_SIZE * FLOOR_MASK_SIZE * 4,
    );
  });
});
