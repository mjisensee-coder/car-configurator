import { NextResponse, type NextRequest } from 'next/server';
import { searchParts } from '@/server/queries';
import { CATEGORIES } from '@/services/partsService';
import type { PartCategory, SortKey } from '@/types';

/**
 * GET /api/parts?category=&q=&maxPrice=&sort=
 *
 * The public read API. Server components query src/server/queries directly
 * and skip this; it exists for client-side callers and for anything else
 * that wants the catalog over HTTP.
 */
const SORTS: SortKey[] = ['name', 'price-asc', 'price-desc'];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const category = searchParams.get('category');
  const sort = searchParams.get('sort') as SortKey | null;
  const maxPriceRaw = searchParams.get('maxPrice');
  const maxPrice = maxPriceRaw === null ? undefined : Number(maxPriceRaw);

  if (category && !(CATEGORIES as string[]).includes(category)) {
    return NextResponse.json(
      { error: `Unknown category "${category}".` },
      { status: 400 },
    );
  }
  if (maxPrice !== undefined && !Number.isFinite(maxPrice)) {
    return NextResponse.json(
      { error: 'maxPrice must be a number.' },
      { status: 400 },
    );
  }

  const parts = await searchParts(
    {
      category: (category as PartCategory) ?? undefined,
      search: searchParams.get('q')?.slice(0, 100) || undefined,
      maxPrice,
    },
    sort && SORTS.includes(sort) ? sort : 'name',
  );

  return NextResponse.json(
    { parts, count: parts.length },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
