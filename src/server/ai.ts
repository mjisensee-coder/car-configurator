import 'server-only';

/**
 * Gemini Vision and Tripo3D proxies.
 *
 * Ported from the Express server.js that Next replaced. The prompts are
 * carried over verbatim — they were tuned against real photos and the
 * client scorers in photoMatchService/partGeneratorService parse their
 * exact field names.
 *
 * Both API keys are read here, on the server, and never reach the browser.
 */

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function hasTripoKey(): boolean {
  return Boolean(process.env.TRIPO3D_API_KEY);
}

export type VisionResult =
  | { ok: true; json: unknown }
  | { ok: false; status: number; error: string };

export async function callGeminiVision(
  prompt: string,
  mimeType: string,
  base64: string,
): Promise<VisionResult> {
  if (!hasGeminiKey()) {
    return { ok: false, status: 503, error: 'GEMINI_API_KEY is not set on the server.' };
  }
  const cleanBase64 = String(base64).replace(/^data:[^;]+;base64,/, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY!)}`;
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: cleanBase64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
  } catch (err) {
    return { ok: false, status: 500, error: `Network error: ${(err as Error)?.message ?? err}` };
  }
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return {
      ok: false,
      status: 502,
      error: `Gemini error (${upstream.status}): ${data?.error?.message ?? 'unknown'}`,
    };
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: false, status: 502, error: 'Gemini returned non-JSON output.' };
  }
}

// ── prompts (verbatim from the Express implementation) ─────────────────

export const MATCH_PROMPTS: Record<string, string> = {
  wheels: `You are an expert car-parts identifier. Analyze this image of an automotive wheel/rim.

Return ONLY a single JSON object with these fields:
- "style": one of "mesh" | "5-spoke" | "multi-spoke" | "split-spoke" | "dish" | "bbs-rs" | "bottlecap" | "other"
- "primaryColor": hex color of the rim face, e.g. "#d4a657" for gold, "#c8ccd1" for silver, "#0a0a0c" for black
- "approxDiameterInches": estimated diameter as a number (typical car wheels are 14-19)
- "brand": brand name string if visible/recognizable, otherwise null
- "finish": one of "polished" | "matte" | "machined" | "painted" | "anodized"
- "confidence": 0-1 confidence in the analysis
- "description": one short sentence describing the wheel`,
  exhaust: `You are an expert car-parts identifier. Analyze this image of an automotive exhaust tip/system.

Return ONLY a single JSON object with these fields:
- "style": one of "single-tip" | "dual-tip" | "quad-tip" | "megaphone" | "other"
- "tipShape": one of "round" | "oval" | "square" | "slash-cut"
- "material": one of "stainless" | "titanium" | "carbon-fiber" | "chrome" | "black"
- "approxDiameterInches": estimated tip diameter
- "brand": brand if visible, otherwise null
- "confidence": 0-1
- "description": one short sentence`,
};

const GENERATE_PROMPT_WHEELS = `You are an expert wheel-style classifier feeding a parametric 3D wheel generator. The 3D generator does NOT see the image — it only sees your JSON output. Your job is to translate the image into the JSON below as accurately as possible, even if the photo is imperfect.

INTERPRETATION RULES:
- If the wheel is shown at an angle (3/4 view, side angle, mounted on a car), MENTALLY ROTATE it to a front-face view and describe what the front face would look like.
- Count *visible* spokes, then estimate the total. A 3/4 view typically hides ~30% of the spokes — extrapolate to a full circle.
- For mesh wheels: count *visible mesh struts* (typically 10–20 thin spokes crossing).
- Ignore brake calipers, tires, fenders — focus only on the rim face.
- If multiple rim styles appear (e.g. side-by-side product shots), describe only the most prominent.

Return ONLY a single JSON object (no prose, no markdown):
- "spokeStyle": one of "thin-spoke" | "thick-spoke" | "split-spoke" | "mesh" | "multi-spoke" | "dish" | "turbine"
    - thin-spoke   = 4–8 narrow straight spokes
    - thick-spoke  = 4–6 chunky wide spokes
    - split-spoke  = 4–6 Y-shaped (one spoke splits into two near the lip) — Apex ARC-8 style
    - mesh         = 10–20 thin spokes forming a mesh/basket — BBS RS style
    - multi-spoke  = 8–12 evenly-spaced narrow spokes
    - dish         = solid disc face with little to no spoke gap
    - turbine      = curved blade-like spokes
- "spokeCount": integer 1–24 (1 for "dish"; for "mesh" use 12–18 typical)
- "diameterInches": estimated wheel diameter, 14–19 typical
- "widthInches": estimated wheel width, 6.5–12 typical
- "color": hex of the rim face. Examples: "#d4a657" gold, "#c8ccd1" silver, "#0a0a0c" black, "#caa45e" bronze. Default to "#c8ccd1" if uncertain.
- "brandGuess": brand string if visible/recognizable (e.g. "BBS", "Apex", "Ronal"), otherwise null
- "finish": one of "chrome" | "matte" | "gloss" | "gold" | "bronze"
- "description": one short sentence describing the wheel`;

const GENERATE_PROMPT_EXHAUST = `You are an expert automotive-exhaust classifier. The downstream system uses your JSON to display the part in a configurator review queue. You do NOT need to be perfect — just translate the image into the JSON below as accurately as possible.

INTERPRETATION RULES:
- Focus on the EXHAUST TIP (the visible chrome/black pipe exit), not the muffler, hangers, or car body.
- If the photo shows the rear bumper area with tips peeking out, describe the tips you can see — ignore the body.
- If multiple tips are visible, count them: 1 = single, 2 = dual, 4 = quad.
- If the tip is angle-cut (slash-cut), say so.

Return ONLY a single JSON object:
- "tipCount": 1 | 2 | 4
- "tipShape": "round" | "oval" | "square" | "slash-cut"
- "material": "stainless" | "chrome" | "titanium" | "carbon-fiber" | "black"
- "approxDiameterInches": estimated tip diameter as number (2.5–5 typical)
- "polished": true | false  (true if it has a mirror shine, false if matte/brushed)
- "brandGuess": brand string if recognizable, otherwise null
- "description": one short sentence`;

export const GENERATE_PROMPTS: Record<string, string> = {
  wheels: GENERATE_PROMPT_WHEELS,
  exhaust: GENERATE_PROMPT_EXHAUST,
};

// ── Tripo3D image-to-3D ────────────────────────────────────────────────

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';

export async function tripoSubmitTask(
  imageBase64: string,
  mimeType: string,
): Promise<string | undefined> {
  const r = await fetch(`${TRIPO_API_BASE}/task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TRIPO3D_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'image_to_model',
      file: { type: mimeType.split('/')[1] ?? 'jpeg', object: { data: imageBase64 } },
      model_version: 'v2.5-20250123',
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(`Tripo3D submit failed (${r.status}): ${data?.message ?? 'unknown'}`);
  }
  return data?.data?.task_id ?? data?.task_id;
}

export async function tripoPollTask(
  taskId: string,
  timeoutMs = 180_000,
): Promise<string | undefined> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`${TRIPO_API_BASE}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${process.env.TRIPO3D_API_KEY}` },
    });
    const data = await r.json().catch(() => ({}));
    const status = data?.data?.status ?? data?.status;
    if (status === 'success' || status === 'completed') {
      return data?.data?.output?.model ?? data?.output?.model;
    }
    if (status === 'failed' || status === 'cancelled') {
      throw new Error(`Tripo3D task ${status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  throw new Error('Tripo3D task timed out');
}
