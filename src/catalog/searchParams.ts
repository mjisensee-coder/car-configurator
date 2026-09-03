import { CATEGORIES } from '@/services/partsService';
import type { PartCategory, SortKey } from '@/types';

/**
 * Coercion for the catalog's URL state.
 *
 * The catalog keeps its filters in the query string so a filtered view is
 * a real, shareable, server-rendered page. That makes the query string
 * untrusted input on a server-rendered path, so every value is validated
 * against a known set here rather than at the call site — `sort` in
 * particular reaches an ORDER BY.
 */
export const SORT_KEYS: SortKey[] = ['price-asc', 'price-desc', 'name'];

export const MAX_SEARCH_LENGTH = 100;

export interface CatalogParams {
  category: PartCategory | 'all';
  search: string;
  sort: SortKey;
}

type RawParams = Record<string, string | string[] | undefined>;

/** Repeated params (`?sort=a&sort=b`) collapse to the first value. */
function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function parseCatalogParams(raw: RawParams): CatalogParams {
  const category = one(raw.category);
  const sort = one(raw.sort) as SortKey;
  return {
    category: (CATEGORIES as string[]).includes(category)
      ? (category as PartCategory)
      : 'all',
    search: one(raw.q).slice(0, MAX_SEARCH_LENGTH),
    sort: SORT_KEYS.includes(sort) ? sort : 'name',
  };
}
