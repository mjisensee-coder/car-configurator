import { NextResponse } from 'next/server';
import { pingDatabase } from '@/server/db';
import { hasGeminiKey, hasTripoKey } from '@/server/ai';

// Railway's healthcheck hits this; it must never be cached.
export const dynamic = 'force-dynamic';

export async function GET() {
  const database = await pingDatabase();
  // A missing database is not fatal — the catalog falls back to the bundled
  // JSON — so only report unhealthy when it is configured but unreachable.
  const healthy = !database.configured || database.reachable;
  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      database,
      features: {
        photoMatch: hasGeminiKey(),
        partGen: hasGeminiKey(),
        tripo3D: hasTripoKey(),
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
