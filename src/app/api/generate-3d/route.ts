import { NextResponse } from 'next/server';
import { hasTripoKey, tripoPollTask, tripoSubmitTask } from '@/server/ai';

/**
 * POST /api/generate-3d — Phase B. Tripo3D image-to-3D for parts whose
 * shape cannot be described parametrically. Falls back to a 2.5D billboard
 * (the uploaded image on a camera-facing plane) when no key is set.
 *
 * Tripo jobs routinely run past a minute, so this route asks for the
 * longest execution window the platform allows. Vercel caps this by plan
 * (300s on Fluid compute, 60s on Hobby); a Railway/Docker deploy has no
 * such cap. If a generation is cut short the admin queue shows the job as
 * errored and it can be retried.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { imageBase64, mimeType, category } = body ?? {};

  if (!imageBase64 || !mimeType || !category) {
    return NextResponse.json(
      { ok: false, error: 'imageBase64, mimeType, and category are required' },
      { status: 400 },
    );
  }

  if (!hasTripoKey()) {
    const cleanBase64 = String(imageBase64).replace(/^data:[^;]+;base64,/, '');
    return NextResponse.json({
      ok: true,
      asset: { kind: 'billboard', url: `data:${mimeType};base64,${cleanBase64}` },
      note: 'TRIPO3D_API_KEY not set — returning 2.5D billboard fallback.',
    });
  }

  try {
    const taskId = await tripoSubmitTask(imageBase64, mimeType);
    if (!taskId) throw new Error('Tripo3D did not return a task id');
    const modelUrl = await tripoPollTask(taskId);
    if (!modelUrl) throw new Error('Tripo3D returned no model URL');
    return NextResponse.json({ ok: true, asset: { kind: 'glb', url: modelUrl } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Tripo3D error: ${(err as Error)?.message ?? err}` },
      { status: 502 },
    );
  }
}
