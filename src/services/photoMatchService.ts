import type { Part, PartCategory } from '@/types';
import { getPartsByCategory } from './partsService';

/**
 * Photo-matching service.
 *
 * Flow:
 *   1. Caller passes a File or base64 string + a category.
 *   2. We POST to /api/match-part, which is an Express endpoint that
 *      proxies to Gemini Vision. The API key lives server-side only.
 *   3. Gemini returns a structured JSON analysis of the part in the photo.
 *   4. We score every catalog part in that category against the analysis
 *      and return the top 3 matches with a 0–1 confidence score.
 *
 * Adding a new category: define a `score<Category>` function below, register
 * it in `SCORERS`, and add the corresponding prompt to `server.js`.
 */

export interface WheelAnalysis {
  style:
    | 'mesh'
    | '5-spoke'
    | 'multi-spoke'
    | 'split-spoke'
    | 'dish'
    | 'bbs-rs'
    | 'bottlecap'
    | 'other';
  primaryColor: string;
  approxDiameterInches: number;
  brand: string | null;
  finish: 'polished' | 'matte' | 'machined' | 'painted' | 'anodized';
  confidence: number;
  description: string;
}

export interface ExhaustAnalysis {
  style: 'single-tip' | 'dual-tip' | 'quad-tip' | 'megaphone' | 'other';
  tipShape: 'round' | 'oval' | 'square' | 'slash-cut';
  material: 'stainless' | 'titanium' | 'carbon-fiber' | 'chrome' | 'black';
  approxDiameterInches: number;
  brand: string | null;
  confidence: number;
  description: string;
}

export type PartAnalysis = WheelAnalysis | ExhaustAnalysis;

export interface MatchResult {
  part: Part;
  score: number;
  reasons: string[];
}

export interface PhotoMatchResponse {
  ok: true;
  analysis: PartAnalysis;
  matches: MatchResult[];
}

export interface PhotoMatchError {
  ok: false;
  error: string;
}

const SCORERS: Partial<
  Record<PartCategory, (analysis: PartAnalysis, parts: Part[]) => MatchResult[]>
> = {
  wheels: scoreWheels as (a: PartAnalysis, p: Part[]) => MatchResult[],
  exhaust: scoreExhaust as (a: PartAnalysis, p: Part[]) => MatchResult[],
};

export async function matchFromPhoto(
  imageBase64: string,
  mimeType: string,
  category: PartCategory,
): Promise<PhotoMatchResponse | PhotoMatchError> {
  const scorer = SCORERS[category];
  if (!scorer) {
    return {
      ok: false,
      error: `Photo matching is not yet supported for "${category}".`,
    };
  }

  let resp: Response;
  try {
    resp = await fetch('/api/match-part', {
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
    | { ok: true; analysis: PartAnalysis }
    | { ok: false; error: string };
  if (!data.ok) return data;

  const matches = scorer(data.analysis, getPartsByCategory(category)).slice(0, 3);
  return { ok: true, analysis: data.analysis, matches };
}

export async function fileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const mimeMatch = result.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg';
      const base64 = result.replace(/^data:[^;]+;base64,/, '');
      resolve({ base64, mimeType });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// =====================================================================
// Scoring
// =====================================================================

/**
 * Map Gemini's wheel-style strings to the render-hint keys used in
 * partsCatalog.json. Helps us bridge the gap between human descriptors
 * and our 3D rendering taxonomy.
 */
const WHEEL_STYLE_ALIASES: Record<string, string[]> = {
  'bbs-rs': ['mesh', 'bbs-rs', 'split-spoke'],
  'ronal-lsi': ['5-spoke', 'split-spoke', 'spoke'],
  'mtech-bottle': ['bottlecap', 'multi-spoke', 'dish'],
};

function scoreWheels(analysis: WheelAnalysis, parts: Part[]): MatchResult[] {
  const targetHex = parseHex(analysis.primaryColor) ?? [200, 200, 200];

  return parts
    .map((part): MatchResult => {
      const partStyle = (part.renderHint?.style as string | undefined) ?? '';
      const aliases = WHEEL_STYLE_ALIASES[partStyle] ?? [];
      const reasons: string[] = [];

      // Style match — strongest signal.
      let styleScore = 0;
      if (analysis.style === partStyle) {
        styleScore = 1;
        reasons.push(`exact style match: ${partStyle}`);
      } else if (aliases.includes(analysis.style)) {
        styleScore = 0.7;
        reasons.push(`similar style (${analysis.style} ≈ ${partStyle})`);
      } else if (analysis.style === 'other') {
        styleScore = 0.35;
      }

      // Color similarity (Euclidean distance in RGB, clamped + inverted).
      const partHex = inferPartColor(part);
      const colorDist = partHex ? rgbDistance(targetHex, partHex) : 200;
      const colorScore = Math.max(0, 1 - colorDist / 280);
      if (colorScore > 0.7 && partHex) {
        reasons.push('color matches');
      }

      // Brand bonus if the photo identified one and it's in our part name.
      let brandBonus = 0;
      if (analysis.brand) {
        const b = analysis.brand.toLowerCase();
        if (
          part.brand.toLowerCase().includes(b) ||
          part.name.toLowerCase().includes(b)
        ) {
          brandBonus = 0.15;
          reasons.push(`brand match: ${analysis.brand}`);
        }
      }

      // Confidence-weighted total
      const raw = styleScore * 0.6 + colorScore * 0.3 + brandBonus + 0.05;
      const score = Math.min(1, raw) * Math.max(0.5, analysis.confidence);

      return { part, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

function scoreExhaust(analysis: ExhaustAnalysis, parts: Part[]): MatchResult[] {
  return parts
    .map((part): MatchResult => {
      const partStyle = (part.renderHint?.style as string | undefined) ?? '';
      const reasons: string[] = [];

      let styleScore = 0;
      if (analysis.style === partStyle) {
        styleScore = 1;
        reasons.push(`exact style: ${analysis.style}`);
      } else if (
        (analysis.style === 'quad-tip' && partStyle === 'dual-tip') ||
        (analysis.style === 'dual-tip' && partStyle === 'quad-tip')
      ) {
        styleScore = 0.6;
        reasons.push('similar tip configuration');
      }

      let materialBonus = 0;
      if (analysis.material === 'titanium' && /titanium|akrapovic/i.test(part.name)) {
        materialBonus = 0.15;
        reasons.push('titanium match');
      }

      let brandBonus = 0;
      if (analysis.brand) {
        const b = analysis.brand.toLowerCase();
        if (part.brand.toLowerCase().includes(b) || part.name.toLowerCase().includes(b)) {
          brandBonus = 0.15;
          reasons.push(`brand match: ${analysis.brand}`);
        }
      }

      const raw = styleScore * 0.7 + materialBonus + brandBonus + 0.05;
      const score = Math.min(1, raw) * Math.max(0.5, analysis.confidence);

      return { part, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

// =====================================================================
// Color helpers
// =====================================================================

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Infer a representative RGB color for a wheel part from its name.
 * The catalog's renderHint doesn't carry color, but the wheel name
 * (e.g. "BBS RS — gold") is enough to ballpark.
 */
function inferPartColor(part: Part): [number, number, number] | null {
  const name = `${part.name} ${part.description}`.toLowerCase();
  if (/gold|bronze/.test(name)) return [212, 166, 87];
  if (/polished|chrome|silver|machined|polished/.test(name)) return [200, 204, 209];
  if (/black|stealth/.test(name)) return [22, 22, 30];
  if (/white/.test(name)) return [240, 240, 245];
  return [170, 178, 188]; // generic alloy
}
