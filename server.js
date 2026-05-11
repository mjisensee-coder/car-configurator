/**
 * Production server. Serves the built Vite bundle from /dist and falls back
 * to index.html so React Router's BrowserRouter works on direct URL hits.
 *
 * API routes:
 *   POST /api/match-part    Gemini Vision proxy for the photo-match feature.
 *   POST /api/generate-part Gemini Vision proxy that returns parametric
 *                           wheel-spec JSON (Phase A of the parts pipeline).
 *   POST /api/generate-3d   Tripo3D proxy for image-to-3D wheels/exhaust
 *                           (Phase B). Falls back to a 2.5D billboard when
 *                           TRIPO3D_API_KEY is unset.
 *
 * All API keys live server-side only.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist');

// Body parser for base64 images (up to ~9MB raw image + JSON overhead).
app.use(express.json({ limit: '12mb' }));

app.use(
  express.static(DIST, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
      if (filePath.endsWith('.glb') || filePath.includes('/models/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // HDRIs are large — cache aggressively.
      if (filePath.endsWith('.hdr') || filePath.includes('/environments/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}
function hasTripoKey() {
  return Boolean(process.env.TRIPO3D_API_KEY);
}

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    features: {
      photoMatch: hasGeminiKey(),
      partGen: hasGeminiKey(),
      tripo3D: hasTripoKey(),
    },
  });
});

// ===================================================================
// Gemini Vision helper — call once with prompt + image, return parsed JSON.
// ===================================================================

async function callGeminiVision(prompt, mimeType, base64) {
  if (!hasGeminiKey()) {
    return { ok: false, status: 503, error: 'GEMINI_API_KEY is not set on the server.' };
  }
  const cleanBase64 = String(base64).replace(/^data:[^;]+;base64,/, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  let upstream;
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
    return { ok: false, status: 500, error: `Network error: ${err?.message ?? err}` };
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

// ===================================================================
// /api/match-part  — photo-match feature. Returns Gemini's analysis JSON
//                    so the client can score it against the catalog.
// ===================================================================

const MATCH_PROMPTS = {
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

app.post('/api/match-part', async (req, res) => {
  if (!hasGeminiKey()) {
    return res.status(503).json({
      ok: false,
      error:
        'Photo-match disabled: GEMINI_API_KEY is not set on the server. Set it in the Railway service variables to enable.',
    });
  }
  const { imageBase64, mimeType, category } = req.body ?? {};
  const prompt = MATCH_PROMPTS[category];
  if (!imageBase64 || !mimeType || !prompt) {
    return res.status(400).json({
      ok: false,
      error: 'imageBase64, mimeType, and a supported category are required',
    });
  }
  const result = await callGeminiVision(prompt, mimeType, imageBase64);
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
  return res.json({ ok: true, analysis: result.json });
});

// ===================================================================
// /api/generate-part  — Phase A of the parts pipeline.
//
// For "wheels": returns a wheel spec the client plugs straight into
// ProceduralWheel without further interpretation.
//
// For "exhaust": returns a structural analysis the admin can show
// alongside the (Tripo3D or billboard) 3D asset, so the operator sees
// what the AI actually understood about the tip — even when Tripo3D
// isn't configured and Phase B falls back to a 2.5D billboard.
// ===================================================================

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

const GENERATE_PROMPTS = {
  wheels: GENERATE_PROMPT_WHEELS,
  exhaust: GENERATE_PROMPT_EXHAUST,
};

app.post('/api/generate-part', async (req, res) => {
  const { imageBase64, mimeType, category } = req.body ?? {};
  const prompt = GENERATE_PROMPTS[category];
  if (!prompt) {
    return res.status(400).json({
      ok: false,
      error: `Unsupported category "${category}". Supported: wheels, exhaust.`,
    });
  }
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ ok: false, error: 'imageBase64 and mimeType are required' });
  }
  const result = await callGeminiVision(prompt, mimeType, imageBase64);
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
  return res.json({ ok: true, analysis: result.json });
});

// ===================================================================
// /api/generate-3d  — Phase B. Tripo3D image-to-3D for complex parts.
//                     Falls back to a 2.5D billboard (= textured plane that
//                     billboards toward the camera, sourced from the
//                     uploaded image) when TRIPO3D_API_KEY is unset.
// ===================================================================

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';

async function tripoSubmitTask(imageBase64, mimeType) {
  // Tripo3D image-to-3D flow: upload image, then create a task. We use
  // their inline base64 input where supported, falling back to the upload
  // endpoint otherwise.
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
  if (!r.ok) throw new Error(`Tripo3D submit failed (${r.status}): ${data?.message ?? 'unknown'}`);
  return data?.data?.task_id ?? data?.task_id;
}

async function tripoPollTask(taskId, timeoutMs = 180_000) {
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
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error('Tripo3D task timed out');
}

app.post('/api/generate-3d', async (req, res) => {
  const { imageBase64, mimeType, category } = req.body ?? {};
  if (!imageBase64 || !mimeType || !category) {
    return res.status(400).json({
      ok: false,
      error: 'imageBase64, mimeType, and category are required',
    });
  }

  // No Tripo3D key → graceful 2.5D billboard fallback. The "asset" is just
  // the source image as a data URL; the client renders it on a plane that
  // billboards toward the camera.
  if (!hasTripoKey()) {
    const cleanBase64 = String(imageBase64).replace(/^data:[^;]+;base64,/, '');
    return res.json({
      ok: true,
      asset: {
        kind: 'billboard',
        url: `data:${mimeType};base64,${cleanBase64}`,
      },
      note: 'TRIPO3D_API_KEY not set — returning 2.5D billboard fallback.',
    });
  }

  try {
    const taskId = await tripoSubmitTask(imageBase64, mimeType);
    if (!taskId) throw new Error('Tripo3D did not return a task id');
    const modelUrl = await tripoPollTask(taskId);
    if (!modelUrl) throw new Error('Tripo3D returned no model URL');
    return res.json({ ok: true, asset: { kind: 'glb', url: modelUrl } });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: `Tripo3D error: ${err?.message ?? err}`,
    });
  }
});

// SPA fallback — must come last
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`E30 Forge running on :${PORT}`);
  console.log(`  photo-match / part-gen: ${hasGeminiKey() ? 'enabled' : 'DISABLED (no GEMINI_API_KEY)'}`);
  console.log(`  tripo3D:                 ${hasTripoKey() ? 'enabled' : 'DISABLED (no TRIPO3D_API_KEY) → billboard fallback'}`);
});
