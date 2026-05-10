import type { PartCategory } from '@/types';
import type {
  ProceduralWheelSpec,
  SpokeStyle,
  WheelFinish,
} from '@/configurator/models/ProceduralWheel';

/**
 * Two-pipeline part generation:
 *
 *   Phase A (procedural)  — for wheels, where parametric geometry is enough.
 *     image  ──(Gemini Vision)──►  PartGenAnalysis  ──►  ProceduralWheelSpec
 *
 *   Phase B (AI 3D)       — for complex shapes (exhausts, body kits) where
 *                           parametric geometry can't capture the form.
 *     image  ──(Tripo3D)──►  GLB URL  (or 2.5D billboard fallback if no key)
 *
 * Both pipelines route through server-side endpoints so API keys stay off
 * the client.
 */

// ===================================================================
// Phase A: procedural part generation
// ===================================================================

export interface PartGenAnalysis {
  spokeStyle: SpokeStyle;
  spokeCount: number;
  diameterInches: number;
  widthInches: number;
  color: string;
  brandGuess: string | null;
  finish: WheelFinish;
  /** Free-form one-line summary from the model. */
  description?: string;
}

export interface PartGenResult {
  ok: true;
  analysis: PartGenAnalysis;
  spec: ProceduralWheelSpec;
}

export interface PartGenError {
  ok: false;
  error: string;
}

export async function generatePartFromPhoto(
  imageBase64: string,
  mimeType: string,
  category: PartCategory,
): Promise<PartGenResult | PartGenError> {
  let resp: Response;
  try {
    resp = await fetch('/api/generate-part', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, category }),
    });
  } catch (err) {
    return {
      ok: false,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const data = (await resp.json()) as
    | { ok: true; analysis: PartGenAnalysis }
    | { ok: false; error: string };

  if (!data.ok) return data;

  const a = data.analysis;
  const spec: ProceduralWheelSpec = {
    diameterInches: clampNumber(a.diameterInches, 13, 22, 17),
    spokeStyle: validSpokeStyle(a.spokeStyle),
    spokeCount: clampNumber(a.spokeCount, 1, 24, 5),
    color: validHex(a.color) ?? '#c8ccd1',
    finish: validFinish(a.finish),
  };
  return { ok: true, analysis: a, spec };
}

// ===================================================================
// Phase B: AI 3D generation (Tripo3D) with 2.5D billboard fallback
// ===================================================================

export interface GeneratedPartAsset {
  /** "glb" = real Tripo3D model. "billboard" = textured plane fallback. */
  kind: 'glb' | 'billboard';
  /** URL to a GLB (kind=glb) or to the source image (kind=billboard). */
  url: string;
  /** Echo of the original analysis if available. */
  analysis?: PartGenAnalysis;
}

export interface GeneratePart3DResult {
  ok: true;
  asset: GeneratedPartAsset;
}

export interface GeneratePart3DError {
  ok: false;
  error: string;
}

export async function generate3DPart(
  imageBase64: string,
  mimeType: string,
  category: PartCategory,
): Promise<GeneratePart3DResult | GeneratePart3DError> {
  let resp: Response;
  try {
    resp = await fetch('/api/generate-3d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, category }),
    });
  } catch (err) {
    return {
      ok: false,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const data = (await resp.json()) as
    | { ok: true; asset: GeneratedPartAsset }
    | { ok: false; error: string };
  return data;
}

// ===================================================================
// Validation helpers — Gemini sometimes returns fields slightly off-shape;
// these guarantee the downstream renderer always gets valid input.
// ===================================================================

const VALID_SPOKES: SpokeStyle[] = [
  'thin-spoke',
  'thick-spoke',
  'split-spoke',
  'mesh',
  'multi-spoke',
  'dish',
  'turbine',
];
const VALID_FINISH: WheelFinish[] = [
  'chrome',
  'matte',
  'gloss',
  'gold',
  'bronze',
];

function validSpokeStyle(s: unknown): SpokeStyle {
  if (typeof s === 'string' && (VALID_SPOKES as string[]).includes(s)) {
    return s as SpokeStyle;
  }
  return 'multi-spoke';
}

function validFinish(s: unknown): WheelFinish {
  if (typeof s === 'string' && (VALID_FINISH as string[]).includes(s)) {
    return s as WheelFinish;
  }
  return 'gloss';
}

function validHex(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim()) ? s.trim() : null;
}

function clampNumber(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
