import { NextResponse } from 'next/server';
import { getBuildById } from '@/server/queries';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const build = await getBuildById(id);
  if (!build) {
    return NextResponse.json({ error: 'Build not found' }, { status: 404 });
  }
  return NextResponse.json(
    { build },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
