import partsCatalog from '@/data/partsCatalog.json';
import type { Part, PartCategory } from '@/types';

/**
 * Data access layer for parts.
 *
 * Today this reads a static JSON. Tomorrow you can swap the implementation
 * for a fetch() against Turn 14, ECS, or your own backend without touching
 * any consumer — the function signatures are the contract.
 */

const ALL: Part[] = partsCatalog as unknown as Part[];

export function getAllParts(): Part[] {
  return ALL;
}

export function getPartById(id: string): Part | undefined {
  return ALL.find((p) => p.id === id);
}

export function getPartsByCategory(category: PartCategory): Part[] {
  return ALL.filter((p) => p.category === category);
}

export interface PartFilter {
  category?: PartCategory;
  search?: string;
  maxPrice?: number;
}

export type SortKey = 'price-asc' | 'price-desc' | 'name';

export function searchParts(filter: PartFilter, sort: SortKey = 'name'): Part[] {
  let result = ALL.slice();
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
