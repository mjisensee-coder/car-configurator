import { beforeAll, describe, expect, it } from 'vitest';
import {
  getAllBuilds,
  getAllParts,
  getBuildById,
  getBuildsByTag,
  getPartById,
  getPartsByCategory,
  searchParts,
  searchWheelsByFitment,
} from '@/server/queries';

/**
 * Exercises the fallback path: no DATABASE_URL, so every query serves the
 * bundled JSON. That path is not a test convenience — it is what keeps the
 * catalog and gallery rendering when Postgres is unreachable, so it has to
 * return the same shapes and orderings the SQL path does.
 *
 * The SQL itself is covered in tests/database.test.ts against a real
 * Postgres engine.
 */
beforeAll(() => {
  delete process.env.DATABASE_URL;
});

describe('parts, without a database', () => {
  it('returns the catalog sorted by name', async () => {
    const parts = await getAllParts();
    expect(parts.length).toBeGreaterThan(0);
    const names = parts.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('looks a part up by id', async () => {
    expect((await getPartById('wheels-bbs-rs'))?.brand).toBe('BBS');
    expect(await getPartById('missing')).toBeUndefined();
  });

  it('filters by category', async () => {
    const wheels = await getPartsByCategory('wheels');
    expect(wheels.every((p) => p.category === 'wheels')).toBe(true);
  });

  it('applies search, price ceiling and sort together', async () => {
    const result = await searchParts({ maxPrice: 3000 }, 'price-desc');
    const prices = result.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    expect(prices.every((p) => p <= 3000)).toBe(true);
  });

  it('searches case-insensitively, matching the SQL ILIKE', async () => {
    const lower = await searchParts({ search: 'bbs' });
    const upper = await searchParts({ search: 'BBS' });
    expect(lower.map((p) => p.id)).toEqual(upper.map((p) => p.id));
    expect(lower.length).toBeGreaterThan(0);
  });
});

describe('wheel fitment', () => {
  it('attaches fitment to wheels and to nothing else', async () => {
    const parts = await getAllParts();
    const withFitment = parts.filter((p) => p.fitment);
    expect(withFitment.length).toBeGreaterThan(0);
    expect(withFitment.every((p) => p.category === 'wheels')).toBe(true);
    expect(
      parts
        .filter((p) => p.category !== 'wheels')
        .every((p) => p.fitment === undefined),
    ).toBe(true);
  });

  it('carries the four ordering fields plus the ones a query needs', async () => {
    const wheel = await getPartById('wheels-bbs-rs');
    expect(wheel?.fitment).toMatchObject({
      boltPattern: '4x100',
      offsetMm: 20,
      widthInches: 8,
      diameterInches: 16,
      tireSize: '205/45R16',
      centerBoreMm: 57.1,
    });
  });

  it('returns every wheel when the query is empty', async () => {
    const { parts } = await searchWheelsByFitment({});
    const wheels = await getPartsByCategory('wheels');
    expect(parts).toHaveLength(wheels.length);
  });

  it('narrows by bolt pattern and diameter', async () => {
    const { parts } = await searchWheelsByFitment({
      boltPattern: '4x100',
      diameterInches: 15,
    });
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.every((p) => p.fitment?.diameterInches === 15)).toBe(true);
  });

  it('returns nothing for a pattern no wheel uses', async () => {
    const { parts } = await searchWheelsByFitment({ boltPattern: '5x120' });
    expect(parts).toHaveLength(0);
  });

  it('filters on an offset range', async () => {
    const { parts } = await searchWheelsByFitment({
      minOffsetMm: 20,
      maxOffsetMm: 30,
    });
    expect(parts.length).toBeGreaterThan(0);
    expect(
      parts.every(
        (p) => p.fitment!.offsetMm >= 20 && p.fitment!.offsetMm <= 30,
      ),
    ).toBe(true);
  });

  it('orders results by diameter then width', async () => {
    const { parts } = await searchWheelsByFitment({});
    const keys = parts.map(
      (p) => p.fitment!.diameterInches * 100 + p.fitment!.widthInches,
    );
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
  });

  it('counts facets over the result set, not the whole catalog', async () => {
    const { parts, facets } = await searchWheelsByFitment({
      diameterInches: 15,
    });
    expect(facets.diameterInches).toEqual([{ value: 15, count: parts.length }]);
    const total = facets.boltPattern.reduce((sum, f) => sum + f.count, 0);
    expect(total).toBe(parts.length);
  });

  it('reports empty facets for an empty result', async () => {
    const { facets } = await searchWheelsByFitment({ boltPattern: '5x120' });
    expect(facets.boltPattern).toEqual([]);
    expect(facets.tireSize).toEqual([]);
  });
});

describe('builds, without a database', () => {
  it('returns builds with a decodable config', async () => {
    const builds = await getAllBuilds();
    expect(builds.length).toBeGreaterThan(0);
    for (const build of builds) {
      expect(typeof build.config.paintId).toBe('string');
      expect(typeof build.config.rideHeight).toBe('number');
      expect(build.totalCost).toBeGreaterThan(0);
    }
  });

  it('looks a build up by id', async () => {
    const [first] = await getAllBuilds();
    expect((await getBuildById(first.id))?.name).toBe(first.name);
    expect(await getBuildById('missing')).toBeUndefined();
  });

  it('filters by tag', async () => {
    const tagged = await getBuildsByTag('track');
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.every((b) => b.tags.includes('track'))).toBe(true);
    expect(await getBuildsByTag('no-such-tag')).toHaveLength(0);
  });
});
