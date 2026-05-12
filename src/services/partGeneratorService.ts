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

/** Analysis shape for a wheel — drives ProceduralWheel. */
export interface WheelAnalysis {
  spokeStyle: SpokeStyle;
  spokeCount: number;
  diameterInches: number;
  widthInches: number;
  color: string;
  brandGuess: string | null;
  finish: WheelFinish;
  description?: string;
}

/** Analysis shape for an exhaust — displayed in the admin review card. */
export interface ExhaustAnalysis {
  tipCount: number;
  tipShape: 'round' | 'oval' | 'square' | 'slash-cut';
  material: 'stainless' | 'chrome' | 'titanium' | 'carbon-fiber' | 'black';
  approxDiameterInches: number;
  polished: boolean;
  brandGuess: string | null;
  description?: string;
}

export type PartGenAnalysis = WheelAnalysis | ExhaustAnalysis;

/** Type guard for the wheel branch. */
export function isWheelAnalysis(a: PartGenAnalysis): a is WheelAnalysis {
  return typeof (a as WheelAnalysis).spokeStyle === 'string';
}

export interface PartGenResult {
  ok: true;
  analysis: PartGenAnalysis;
  /** Only set when the analysis was a wheel (Phase A renders to ProceduralWheel). */
  spec?: ProceduralWheelSpec;
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

  // Wheel category gets an extra step: derive a ProceduralWheelSpec.
  // Exhaust analysis is returned as-is — the admin shows it as a metadata
  // card alongside the Phase B 3D asset.
  if (category !== 'wheels') {
    return { ok: true, analysis: data.analysis };
  }

  const a = data.analysis as WheelAnalysis;
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
// Phase B: AI 3D generation (TRELLIS / Tripo3D) with billboard fallback
// ===================================================================

/** Which 3D backend ran on the server for this asset. */
export type Generation3DBackend = 'fal' | 'tripo' | 'billboard';

export interface GeneratedPartAsset {
  /** "glb" = real 3D mesh. "billboard" = textured plane fallback. */
  kind: 'glb' | 'billboard';
  /** URL to a GLB (kind=glb) or to the source image (kind=billboard). */
  url: string;
  /** Echo of the original analysis if available. */
  analysis?: PartGenAnalysis;
}

export interface GeneratePart3DResult {
  ok: true;
  asset: GeneratedPartAsset;
  /** Which backend actually produced the asset (may differ from requested). */
  backend: Generation3DBackend;
  /** What the caller asked for, if anything. */
  requestedBackend?: Generation3DBackend;
  /** Server-side note (e.g. "fal.ai unavailable, fell back to Tripo3D"). */
  note?: string;
}

export interface GeneratePart3DError {
  ok: false;
  error: string;
  /** Backend that errored, if we got that far. */
  backend?: Generation3DBackend;
  requestedBackend?: Generation3DBackend;
}

/**
 * Kick off a 3D generation. The server picks a backend when `backend` is
 * omitted — defaults to fal.ai TRELLIS when FAL_KEY is set, otherwise
 * Tripo3D, otherwise a 2.5D billboard.
 */
export async function generate3DPart(
  imageBase64: string,
  mimeType: string,
  category: PartCategory,
  backend?: Generation3DBackend,
): Promise<GeneratePart3DResult | GeneratePart3DError> {
  let resp: Response;
  try {
    resp = await fetch('/api/generate-3d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, category, backend }),
    });
  } catch (err) {
    return {
      ok: false,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const data = (await resp.json()) as
    | {
        ok: true;
        asset: GeneratedPartAsset;
        backend: Generation3DBackend;
        requestedBackend?: Generation3DBackend;
        note?: string;
      }
    | {
        ok: false;
        error: string;
        backend?: Generation3DBackend;
        requestedBackend?: Generation3DBackend;
      };
  return data;
}

// ===================================================================
// Health probe — tells the client which 3D backends are available so
// the admin UI can pre-select the right default and show accurate badges.
// ===================================================================

export interface BackendFeatures {
  photoMatch: boolean;
  partGen: boolean;
  tripo3D: boolean;
  trellis: boolean;
}

export interface BackendHealth {
  features: BackendFeatures;
  defaultBackend: Generation3DBackend;
}

export async function fetchBackendHealth(): Promise<BackendHealth | null> {
  try {
    const r = await fetch('/healthz');
    if (!r.ok) return null;
    const data = await r.json();
    return {
      features: data.features ?? {
        photoMatch: false,
        partGen: false,
        tripo3D: false,
        trellis: false,
      },
      defaultBackend: data.defaultBackend ?? 'billboard',
    };
  } catch {
    return null;
  }
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
