import { NextResponse } from 'next/server';
import { callGeminiVision, GENERATE_PROMPTS } from '@/server/ai';

/**
 * POST /api/generate-part — Phase A of the parts pipeline. For wheels it
 * returns a parametric spec the client feeds straight into ProceduralWheel;
 * for exhausts it returns a structural analysis for the admin review card.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { imageBase64, mimeType, category } = body ?? {};
  const prompt = GENERATE_PROMPTS[category];

  if (!prompt) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported category "${category}". Supported: wheels, exhaust.`,
      },
      { status: 400 },
    );
  }
  if (!imageBase64 || !mimeType) {
    return NextResponse.json(
      { ok: false, error: 'imageBase64 and mimeType are required' },
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
