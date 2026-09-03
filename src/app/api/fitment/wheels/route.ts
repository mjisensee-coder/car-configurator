import { NextResponse, type NextRequest } from 'next/server';
import { searchWheelsByFitment } from '@/server/queries';

/**
 * GET /api/fitment/wheels?boltPattern=4x100&diameter=15&width=7&minOffset=&maxOffset=
 *
 * Answers "will this fit" as a query over the `wheel_fitment` columns and
 * returns facet counts alongside the matches, so a filter UI can show how
 * many wheels each remaining option would yield.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;

  const numeric = (key: string): number | undefined => {
    const raw = q.get(key);
    if (raw === null || raw === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const { parts, facets } = await searchWheelsByFitment({
    boltPattern: q.get('boltPattern') ?? undefined,
    diameterInches: numeric('diameter'),
    widthInches: numeric('width'),
    minOffsetMm: numeric('minOffset'),
    maxOffsetMm: numeric('maxOffset'),
  });

  return NextResponse.json(
    { parts, facets, count: parts.length },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
