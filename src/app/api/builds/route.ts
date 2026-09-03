import { NextResponse, type NextRequest } from 'next/server';
import { getAllBuilds, getBuildsByTag } from '@/server/queries';

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get('tag');
  const builds = tag ? await getBuildsByTag(tag) : await getAllBuilds();
  return NextResponse.json(
    { builds, count: builds.length },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
