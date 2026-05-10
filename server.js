/**
 * Production server. Serves the built Vite bundle from /dist and falls back
 * to index.html so React Router's BrowserRouter works on direct URL hits.
 *
 * Express isn't strictly required (we could use a static-only server), but
 * keeping it here gives us an obvious place to add API routes — the
 * `/api/match-part` Gemini proxy below is the first such use case.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist');

// Body parser — needed for /api/match-part which receives base64 images.
app.use(express.json({ limit: '12mb' }));

app.use(
  express.static(DIST, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
      // Long-cache the GLB and texture files; they're hashed by name so
      // bumps go through fine.
      if (filePath.endsWith('.glb') || filePath.includes('/models/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', features: { photoMatch: hasGeminiKey() } });
});

// ===================================================================
// /api/match-part — Gemini Vision proxy for the photo-matching feature.
//
// Why proxy: the GEMINI_API_KEY is server-side only. We never expose it
// to the browser. The client uploads a base64 image + a category hint;
// we forward to Gemini and return the structured JSON.
//
// Request:  { imageBase64: string, mimeType: string, category: 'wheels' | ... }
// Response: { ok: true,  analysis: <Gemini JSON> }
//        |  { ok: false, error: string }
// ===================================================================

function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

const PROMPTS = {
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
  if (!imageBase64 || !mimeType || !category) {
    return res
      .status(400)
      .json({ ok: false, error: 'imageBase64, mimeType, and category are required' });
  }
  const prompt = PROMPTS[category];
  if (!prompt) {
    return res
      .status(400)
      .json({ ok: false, error: `Unsupported category: ${category}` });
  }

  // Strip any leading "data:image/...;base64," prefix the client may have left.
  const cleanBase64 = String(imageBase64).replace(/^data:[^;]+;base64,/, '');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
    const upstream = await fetch(url, {
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
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(502).json({
        ok: false,
        error: `Gemini error (${upstream.status}): ${data?.error?.message ?? 'unknown'}`,
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? '';
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Gemini returned non-JSON output. Try again.',
      });
    }

    return res.json({ ok: true, analysis });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: `Server error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

// SPA fallback — must come last
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`E30 Forge running on :${PORT}`);
  console.log(`  photo-match: ${hasGeminiKey() ? 'enabled' : 'DISABLED (no GEMINI_API_KEY)'}`);
});
