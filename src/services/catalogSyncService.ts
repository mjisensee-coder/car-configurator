import trialPartsData from '@/data/trialParts.json';
import type { PartCategory } from '@/types';
import {
  generatePartFromPhoto,
  generate3DPart,
  type PartGenAnalysis,
  type GeneratedPartAsset,
} from './partGeneratorService';
import type { ProceduralWheelSpec } from '@/configurator/models/ProceduralWheel';

/**
 * Catalog sync + 3D generation queue (in-memory for v1).
 *
 * Pulls "candidate" parts from trialParts.json and walks each through the
 * generation pipeline:
 *
 *   wheels   → /api/generate-part (Gemini)  → ProceduralWheelSpec  → ready
 *   exhaust  → /api/generate-3d  (Tripo3D)  → GLB asset URL        → ready
 *
 * The admin page then reviews each generation and approves it (writing to
 * the on-disk registry.json — out of scope for client-only v1; v2 swaps
 * this in-memory store for a real backend write).
 */

export interface TrialPart {
  id: string;
  category: PartCategory;
  displayName: string;
  vendor: string;
  vendorProductUrl: string;
  imageUrl: string;
  imageAttribution: string;
  notes?: string;
}

export type QueueStatus = 'pending' | 'generating' | 'review' | 'approved' | 'rejected' | 'error';

export interface QueueEntry {
  id: string;
  trial: TrialPart;
  status: QueueStatus;
  /** Phase-A wheel spec (only set for wheel pipeline). */
  wheelSpec?: ProceduralWheelSpec;
  /** Phase-A raw analysis. */
  analysis?: PartGenAnalysis;
  /** Phase-B 3D asset (only set for exhaust/complex pipeline). */
  asset?: GeneratedPartAsset;
  /** Last error if status = "error". */
  error?: string;
  updatedAt: number;
}

const TRIAL_PARTS = trialPartsData as TrialPart[];

// In-memory store. Survives across page navigations because services are
// module-scoped. A full implementation would persist to a backend.
const queue = new Map<string, QueueEntry>();
const subscribers = new Set<() => void>();

/**
 * Stable-reference cache for the queue and the approved-entries view.
 *
 * Returning a fresh array from getSnapshot() each call breaks
 * useSyncExternalStore (React 18) — Object.is sees a "change" every
 * check, schedules a re-render, which calls getSnapshot again, etc.
 * Eventually React throws #185 ("Maximum update depth exceeded") and
 * the whole tree tears down. We caught this exact crash on /configure
 * via a wheel swap.
 *
 * The cache is null-checked and rebuilt on demand; `notify()` clears
 * both caches whenever the underlying queue mutates.
 */
let queueArrayCache: QueueEntry[] | null = null;
let approvedCache: RegistryEntry[] | null = null;

function notify() {
  queueArrayCache = null;
  approvedCache = null;
  subscribers.forEach((fn) => fn());
}

export function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/**
 * Initialize the queue with all trial parts (pending). Idempotent.
 */
export function loadTrialParts(): QueueEntry[] {
  for (const trial of TRIAL_PARTS) {
    if (!queue.has(trial.id)) {
      queue.set(trial.id, {
        id: trial.id,
        trial,
        status: 'pending',
        updatedAt: Date.now(),
      });
    }
  }
  notify();
  return getQueue();
}

export function getQueue(): QueueEntry[] {
  if (queueArrayCache !== null) return queueArrayCache;
  queueArrayCache = Array.from(queue.values()).sort(
    (a, b) => a.updatedAt - b.updatedAt,
  );
  return queueArrayCache;
}

export function getEntry(id: string): QueueEntry | undefined {
  return queue.get(id);
}

function update(id: string, patch: Partial<QueueEntry>) {
  const cur = queue.get(id);
  if (!cur) return;
  queue.set(id, { ...cur, ...patch, updatedAt: Date.now() });
  notify();
}

/**
 * Run the right pipeline for a queue entry. Wheels go to Phase A,
 * everything else to Phase B (Tripo3D + billboard fallback).
 */
export async function runGeneration(id: string): Promise<void> {
  const entry = queue.get(id);
  if (!entry) return;

  update(id, { status: 'generating', error: undefined });

  try {
    // Fetch the source image and convert to base64. Pulling client-side
    // is fine because trial images are public CDN URLs.
    const imgResp = await fetch(entry.trial.imageUrl);
    if (!imgResp.ok) throw new Error(`Image fetch failed (${imgResp.status})`);
    const blob = await imgResp.blob();
    const mimeType = blob.type || 'image/jpeg';
    const base64 = await blobToBase64(blob);

    if (entry.trial.category === 'wheels') {
      const result = await generatePartFromPhoto(base64, mimeType, 'wheels');
      if (!result.ok) throw new Error(result.error);
      update(id, {
        status: 'review',
        wheelSpec: result.spec,
        analysis: result.analysis,
      });
      return;
    }

    // Phase B path (exhaust + future categories).
    const result = await generate3DPart(base64, mimeType, entry.trial.category);
    if (!result.ok) throw new Error(result.error);
    update(id, { status: 'review', asset: result.asset });
  } catch (err) {
    update(id, {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function approve(id: string): void {
  // For v1: status flip only. Persisting into registry.json requires a
  // backend write (out of scope for the client-only POC).
  update(id, { status: 'approved' });
}

export function reject(id: string): void {
  update(id, { status: 'rejected' });
}

// =====================================================================
// Helpers
// =====================================================================

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:[^;]+;base64,/, ''));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// =====================================================================
// Registry (read-only client view of approved parts)
// =====================================================================

export interface RegistryEntry {
  id: string;
  category: PartCategory;
  displayName: string;
  vendor: string;
  vendorProductUrl: string;
  /** "glb" → URL to a GLB; "procedural" → renders ProceduralWheel from wheelSpec. */
  kind: 'glb' | 'procedural' | 'billboard';
  glbUrl?: string;
  billboardImageUrl?: string;
  wheelSpec?: ProceduralWheelSpec;
  /** Mount transforms when the part is placed on the car. */
  mount?: {
    scale?: number;
    offset?: [number, number, number];
    rotation?: [number, number, number];
  };
}

export interface Registry {
  version: number;
  description: string;
  entries: RegistryEntry[];
}

export async function fetchRegistry(): Promise<Registry> {
  const r = await fetch('/generated-parts/registry.json');
  if (!r.ok) {
    return { version: 0, description: 'Empty', entries: [] };
  }
  return (await r.json()) as Registry;
}

/**
 * Approved-in-this-session registry entries.
 *
 * v1 doesn't persist approvals to /public/generated-parts/registry.json
 * (no server-side write endpoint yet). Instead, the configurator reads
 * the in-memory queue, so approving a generation in /admin makes that
 * part immediately selectable in /configure during the same session.
 */
export function getApprovedRegistryEntries(): RegistryEntry[] {
  // Cached: returning a fresh array each call breaks useSyncExternalStore
  // (React #185, "Maximum update depth exceeded"). Rebuilt on demand and
  // invalidated by notify() whenever the queue actually mutates.
  if (approvedCache !== null) return approvedCache;
  const out: RegistryEntry[] = [];
  for (const entry of queue.values()) {
    if (entry.status !== 'approved') continue;
    if (entry.wheelSpec) {
      out.push({
        id: entry.id,
        category: entry.trial.category,
        displayName: entry.trial.displayName,
        vendor: entry.trial.vendor,
        vendorProductUrl: entry.trial.vendorProductUrl,
        kind: 'procedural',
        wheelSpec: entry.wheelSpec,
      });
    } else if (entry.asset?.kind === 'glb') {
      out.push({
        id: entry.id,
        category: entry.trial.category,
        displayName: entry.trial.displayName,
        vendor: entry.trial.vendor,
        vendorProductUrl: entry.trial.vendorProductUrl,
        kind: 'glb',
        glbUrl: entry.asset.url,
      });
    } else if (entry.asset?.kind === 'billboard') {
      out.push({
        id: entry.id,
        category: entry.trial.category,
        displayName: entry.trial.displayName,
        vendor: entry.trial.vendor,
        vendorProductUrl: entry.trial.vendorProductUrl,
        kind: 'billboard',
        billboardImageUrl: entry.asset.url,
      });
    }
  }
  approvedCache = out;
  return approvedCache;
}
