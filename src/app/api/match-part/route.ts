import { NextResponse } from 'next/server';
import { callGeminiVision, hasGeminiKey, MATCH_PROMPTS } from '@/server/ai';

/**
 * POST /api/match-part — Gemini Vision proxy for the photo-match feature.
 * Returns the raw analysis JSON; the client scores it against the catalog
 * in photoMatchService.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!hasGeminiKey()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Photo-match disabled: GEMINI_API_KEY is not set on the server. Set it in the deployment environment to enable.',
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { imageBase64, mimeType, category } = body ?? {};
  const prompt = MATCH_PROMPTS[category];
  if (!imageBase64 || !mimeType || !prompt) {
    return NextResponse.json(
      {
        ok: false,
        error: 'imageBase64, mimeType, and a supported category are required',
      },
      { status: 400 },
    );
  }

  const result = await callGeminiVision(prompt, mimeType, imageBase64);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, analysis: result.json });
}
