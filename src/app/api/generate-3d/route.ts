import { NextResponse } from 'next/server';
import {
  billboardAsset,
  falPollTask,
  falSubmitTask,
  hasTripoKey,
  persistRemoteGlb,
  resolveBackend,
  tripoPollTask,
  tripoSubmitTask,
} from '@/server/ai';

/**
 * POST /api/generate-3d — Phase B, pluggable image-to-3D backends.
 *
 *   backend=fal       → fal.ai TRELLIS (~$0.02/run). Default when FAL_KEY
 *                       is set. Fast (~30s) and dirt cheap.
 *   backend=tripo     → Tripo3D image-to-model (~$0.30/run). Higher
 *                       fidelity on fine detail but ~10× the cost.
 *   backend=billboard → No external call. Returns the uploaded image as a
 *                       data URL for a camera-facing plane.
 *
 * Degrades rather than fails: an unavailable or erroring backend falls
 * through to the next-best one, and the response says which actually ran
 * so the admin badge stays honest.
 *
 * Generation routinely runs past a minute, so this asks for the longest
 * window the platform allows. Vercel caps it by plan (60s on Hobby); a
 * Railway/Docker deploy has no cap.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { imageBase64, mimeType, category, backend: requestedBackend } = body ?? {};

  if (!imageBase64 || !mimeType || !category) {
    return NextResponse.json(
      { ok: false, error: 'imageBase64, mimeType, and category are required' },
      { status: 400 },
    );
  }

  const { backend, degraded, requested } = resolveBackend(requestedBackend);
  const degradedNote = degraded
    ? `Requested backend "${requested}" unavailable (no API key) — using "${backend}" instead.`
    : undefined;

  if (backend === 'billboard') {
    return NextResponse.json({
      ok: true,
      backend: 'billboard',
      requestedBackend: requested,
      asset: billboardAsset(imageBase64, mimeType),
      note:
        degradedNote ??
        'No 3D backend configured — returning 2.5D billboard fallback.',
    });
  }

  // Carries a fal.ai failure reason into the Tripo3D response below, so the
  // admin can see why the cheaper backend did not run.
  let falFallbackNote: string | undefined;

  if (backend === 'fal') {
    try {
      const requestId = await falSubmitTask(imageBase64, mimeType);
      const remoteUrl = await falPollTask(requestId);
      const { url, persisted } = await persistRemoteGlb(remoteUrl, 'trellis');
      return NextResponse.json({
        ok: true,
        backend: 'fal',
        requestedBackend: requested,
        asset: { kind: 'glb', url },
        note: persisted
          ? degradedNote
          : [degradedNote, 'Served from the upstream URL — it will expire.']
              .filter(Boolean)
              .join(' '),
      });
    } catch (err) {
      const reason = (err as Error)?.message ?? String(err);
      if (!hasTripoKey()) {
        return NextResponse.json({
          ok: true,
          backend: 'billboard',
          requestedBackend: requested,
          asset: billboardAsset(imageBase64, mimeType),
          note: `fal.ai error (${reason}) — fell back to 2.5D billboard.`,
        });
      }
      falFallbackNote = `fal.ai error (${reason}) — fell back to Tripo3D.`;
    }
  }

  // backend === 'tripo', either asked for directly or reached via fal.ai.
  try {
    const taskId = await tripoSubmitTask(imageBase64, mimeType);
    if (!taskId) throw new Error('Tripo3D did not return a task id');
    const modelUrl = await tripoPollTask(taskId);
    if (!modelUrl) throw new Error('Tripo3D returned no model URL');
    const { url, persisted } = await persistRemoteGlb(modelUrl, 'tripo');
    return NextResponse.json({
      ok: true,
      backend: 'tripo',
      requestedBackend: requested,
      asset: { kind: 'glb', url },
      note: persisted
        ? (falFallbackNote ?? degradedNote)
        : [falFallbackNote ?? degradedNote, 'Served from the upstream URL — it will expire.']
            .filter(Boolean)
            .join(' '),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        backend: 'tripo',
        requestedBackend: requested,
        error: `Tripo3D error: ${(err as Error)?.message ?? err}`,
      },
      { status: 502 },
    );
  }
}
