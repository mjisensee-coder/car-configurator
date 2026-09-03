import { describe, expect, it } from 'vitest';
import {
  MAX_SEARCH_LENGTH,
  parseCatalogParams,
} from '@/catalog/searchParams';

/**
 * The catalog renders on the server from its query string, so these values
 * are untrusted input on a server-rendered path. `sort` reaches an ORDER BY
 * clause, which is why it is whitelisted rather than interpolated.
 */
describe('parseCatalogParams', () => {
  it('defaults an empty query string', () => {
    expect(parseCatalogParams({})).toEqual({
      category: 'all',
      search: '',
      sort: 'name',
    });
  });

  it('accepts every real category', () => {
    for (const category of ['paint', 'wheels', 'exhaust', 'suspension', 'stickers']) {
      expect(parseCatalogParams({ category }).category).toBe(category);
    }
  });

  it.each([['bogus'], [''], ['WHEELS'], ['wheels; DROP TABLE parts']])(
    'falls back to "all" for category %s',
    (category) => {
      expect(parseCatalogParams({ category }).category).toBe('all');
    },
  );

  it('accepts every real sort key', () => {
    for (const sort of ['name', 'price-asc', 'price-desc']) {
      expect(parseCatalogParams({ sort }).sort).toBe(sort);
    }
  });

  it.each([
    ['an unknown key', 'cheapest'],
    ['a SQL fragment', 'price_cents; DROP TABLE parts'],
    ['an ORDER BY injection', 'name ASC, (SELECT 1)'],
  ])('falls back to "name" sort for %s', (_label, sort) => {
    expect(parseCatalogParams({ sort }).sort).toBe('name');
  });

  it('caps the search term so a huge URL cannot become a huge LIKE', () => {
    const long = 'a'.repeat(MAX_SEARCH_LENGTH + 500);
    expect(parseCatalogParams({ q: long }).search).toHaveLength(
      MAX_SEARCH_LENGTH,
    );
  });

  it('collapses a repeated parameter to its first value', () => {
    expect(parseCatalogParams({ category: ['wheels', 'paint'] }).category).toBe(
      'wheels',
    );
    expect(parseCatalogParams({ sort: ['price-asc', 'name'] }).sort).toBe(
      'price-asc',
    );
  });
});
