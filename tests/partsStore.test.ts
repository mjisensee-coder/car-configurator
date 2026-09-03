import { beforeEach, describe, expect, it } from 'vitest';
import {
  getParts,
  getPartFromStore,
  hydrateParts,
  getPartsVersion,
} from '@/services/partsStore';
import {
  CATEGORIES,
  getAllParts,
  getPartById,
  getPartsByCategory,
  searchParts,
} from '@/services/partsService';
import { FALLBACK_PARTS } from '@/data/fallbackCatalog';
import type { Part } from '@/types';

const part = (over: Partial<Part> = {}): Part => ({
  id: 'test-part',
  category: 'wheels',
  name: 'Test Wheel',
  brand: 'Testco',
  price: 100,
  image: 'https://example.test/x.jpg',
  description: 'A wheel for tests.',
  vendor: 'ECS Tuning',
  affiliateUrl: 'https://example.test/buy',
  ...over,
});

beforeEach(() => {
  // Reset to the bundled catalog between tests — the store is module state.
  hydrateParts(FALLBACK_PARTS);
});

/**
 * The 3D scene resolves parts synchronously during render, which is why
 * this store exists at all. These cover the seed-then-hydrate contract the
 * server components depend on.
 */
describe('parts store', () => {
  it('is seeded with the bundled catalog, so the scene is never empty', () => {
    expect(getParts().length).toBeGreaterThan(0);
    expect(getPartFromStore('wheels-bbs-rs')).toBeDefined();
  });

  it('replaces the catalog when the server hands it rows', () => {
    hydrateParts([part({ id: 'from-db', name: 'From Postgres' })]);
    expect(getParts()).toHaveLength(1);
    expect(getPartFromStore('from-db')?.name).toBe('From Postgres');
  });

  it('ignores an empty payload rather than blanking the catalog', () => {
    const before = getParts().length;
    hydrateParts([]);
    hydrateParts(undefined);
    hydrateParts(null);
    expect(getParts()).toHaveLength(before);
  });

  it('no-ops when hydrated with the same array, so re-renders are free', () => {
    const rows = [part()];
    hydrateParts(rows);
    const version = getPartsVersion();
    hydrateParts(rows);
    expect(getPartsVersion()).toBe(version);
  });
});

describe('parts service reads', () => {
  it('exposes the same rows as the store', () => {
    expect(getAllParts()).toEqual(getParts());
  });

  it('finds a part by id and returns undefined for an unknown one', () => {
    expect(getPartById('wheels-bbs-rs')?.brand).toBe('BBS');
    expect(getPartById('nope')).toBeUndefined();
  });

  it('filters by category', () => {
    const wheels = getPartsByCategory('wheels');
    expect(wheels.length).toBeGreaterThan(0);
    expect(wheels.every((p) => p.category === 'wheels')).toBe(true);
  });

  it('covers every declared category with at least one part', () => {
    for (const category of CATEGORIES) {
      expect(getPartsByCategory(category).length).toBeGreaterThan(0);
    }
  });
});

describe('searchParts', () => {
  it('matches on name, brand and description', () => {
    expect(searchParts({ search: 'bbs' }).length).toBeGreaterThan(0);
    expect(searchParts({ search: 'BBS' }).length).toBeGreaterThan(0);
    expect(searchParts({ search: 'zzzzz-no-match' })).toHaveLength(0);
  });

  it('applies a price ceiling', () => {
    const cheap = searchParts({ maxPrice: 250 });
    expect(cheap.length).toBeGreaterThan(0);
    expect(cheap.every((p) => p.price <= 250)).toBe(true);
  });

  it('sorts by price ascending and descending', () => {
    const asc = searchParts({}, 'price-asc').map((p) => p.price);
    const desc = searchParts({}, 'price-desc').map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('sorts by name by default', () => {
    const names = searchParts({}).map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('combines category and search', () => {
    const result = searchParts({ category: 'wheels', search: 'bbs' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.category === 'wheels')).toBe(true);
  });

  it('does not mutate the stored catalog while sorting', () => {
    const before = getParts().map((p) => p.id);
    searchParts({}, 'price-desc');
    expect(getParts().map((p) => p.id)).toEqual(before);
  });
});
