import { NextResponse } from 'next/server';
import { getPartById } from '@/server/queries';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const part = await getPartById(id);
  if (!part) {
    return NextResponse.json({ error: 'Part not found' }, { status: 404 });
  }
  return NextResponse.json(
    { part },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
