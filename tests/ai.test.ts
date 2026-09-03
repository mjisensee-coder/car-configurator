import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  billboardAsset,
  defaultBackend,
  hasFalKey,
  hasGeminiKey,
  hasTripoKey,
  resolveBackend,
} from '@/server/ai';

/**
 * The image-to-3D backends differ by an order of magnitude in cost
 * (TRELLIS ~$0.02/run vs Tripo3D ~$0.30/run), so which one a request
 * lands on is worth pinning down. The degradation chain is also what
 * keeps the admin queue working with no keys configured at all.
 */
const KEYS = ['FAL_KEY', 'TRIPO3D_API_KEY', 'GEMINI_API_KEY'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('key detection', () => {
  it('reports each key independently', () => {
    expect([hasFalKey(), hasTripoKey(), hasGeminiKey()]).toEqual([false, false, false]);
    process.env.FAL_KEY = 'x';
    process.env.GEMINI_API_KEY = 'y';
    expect([hasFalKey(), hasTripoKey(), hasGeminiKey()]).toEqual([true, false, true]);
  });

  it('treats an empty string as unset', () => {
    process.env.FAL_KEY = '';
    expect(hasFalKey()).toBe(false);
  });
});

describe('defaultBackend', () => {
  it('prefers the cheap backend when it is available', () => {
    process.env.FAL_KEY = 'x';
    process.env.TRIPO3D_API_KEY = 'y';
    expect(defaultBackend()).toBe('fal');
  });

  it('uses Tripo3D when only that key is set', () => {
    process.env.TRIPO3D_API_KEY = 'y';
    expect(defaultBackend()).toBe('tripo');
  });

  it('falls back to the free billboard with no keys', () => {
    expect(defaultBackend()).toBe('billboard');
  });
});

describe('resolveBackend', () => {
  it('honours an explicit, available request', () => {
    process.env.FAL_KEY = 'x';
    process.env.TRIPO3D_API_KEY = 'y';
    expect(resolveBackend('tripo')).toEqual({
      backend: 'tripo',
      degraded: false,
      requested: 'tripo',
    });
  });

  it('degrades to Tripo3D when fal.ai has no key', () => {
    process.env.TRIPO3D_API_KEY = 'y';
    expect(resolveBackend('fal')).toEqual({
      backend: 'tripo',
      degraded: true,
      requested: 'fal',
    });
  });

  it('degrades all the way to a billboard with no keys', () => {
    expect(resolveBackend('fal')).toEqual({
      backend: 'billboard',
      degraded: true,
      requested: 'fal',
    });
  });

  it('never reports degraded when billboard was what was asked for', () => {
    expect(resolveBackend('billboard')).toEqual({
      backend: 'billboard',
      degraded: false,
      requested: 'billboard',
    });
  });

  it('treats an unknown backend name as no preference', () => {
    process.env.FAL_KEY = 'x';
    expect(resolveBackend('magic')).toEqual({
      backend: 'fal',
      degraded: false,
      requested: 'fal',
    });
  });

  it('resolves an absent request to the default', () => {
    process.env.TRIPO3D_API_KEY = 'y';
    expect(resolveBackend(undefined).backend).toBe('tripo');
  });
});

describe('billboardAsset', () => {
  it('wraps raw base64 as a data URL', () => {
    expect(billboardAsset('aGk=', 'image/png')).toEqual({
      kind: 'billboard',
      url: 'data:image/png;base64,aGk=',
    });
  });

  it('does not double-prefix an existing data URL', () => {
    const asset = billboardAsset('data:image/jpeg;base64,aGk=', 'image/jpeg');
    expect(asset.url).toBe('data:image/jpeg;base64,aGk=');
  });
});
