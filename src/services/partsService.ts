import type { Part, PartCategory, PartFilter, SortKey } from '@/types';
import { getPartFromStore, getParts } from './partsStore';

/**
 * Client-side data access for parts.
 *
 * The signatures are unchanged from the JSON-file version — that was the
 * contract CLAUDE.md promised, and it is why the 3D scene, sidebar and
 * summary panel needed no edits when Postgres landed behind them.
 *
 * The rows themselves now come from Postgres: a server component queries
 * src/server/queries.ts and hands the result to <CatalogHydrator>, which
 * fills the store this module reads. Server components should import
 * @/server/queries directly instead of using these helpers.
 */

export type { PartFilter, SortKey };

export function getAllParts(): Part[] {
  return getParts();
}

export function getPartById(id: string): Part | undefined {
  return getPartFromStore(id);
}

export function getPartsByCategory(category: PartCategory): Part[] {
  return getParts().filter((p) => p.category === category);
}

export function searchParts(filter: PartFilter, sort: SortKey = 'name'): Part[] {
  let result = getParts().slice();
  if (filter.category) {
    result = result.filter((p) => p.category === filter.category);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }
  if (typeof filter.maxPrice === 'number') {
    result = result.filter((p) => p.price <= filter.maxPrice!);
  }
  switch (sort) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'name':
    default:
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  return result;
}

export const CATEGORIES: PartCategory[] = [
  'paint',
  'wheels',
  'exhaust',
  'suspension',
  'stickers',
];
