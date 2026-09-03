import { FALLBACK_PARTS } from '@/data/fallbackCatalog';
import type { Part } from '@/types';

/**
 * In-memory catalog for the client.
 *
 * Why a store instead of async services: the 3D scene reads parts
 * synchronously during render — <Wheel>, <ExhaustTip> and <RealCar> all
 * call getPartById() to resolve a render hint. Making the read async would
 * mean threading loading states through every mesh. Instead the server
 * component fetches once and hands the rows to <CatalogHydrator>, which
 * fills this store before any consumer renders.
 *
 * It is seeded with the bundled JSON so the store is never empty: the scene
 * always has something to render, even before hydration and even if the
 * database is unreachable.
 */

let parts: Part[] = FALLBACK_PARTS;
let byId = new Map(parts.map((p) => [p.id, p]));
let version = 0;

const listeners = new Set<() => void>();

/**
 * Replace the catalog with server-provided rows. Idempotent: re-hydrating
 * with the same payload is a no-op, so calling it during every render of
 * the hydrator component is safe.
 */
export function hydrateParts(next: Part[] | undefined | null): void {
  if (!next || next.length === 0) return;
  if (next === parts) return;
  parts = next;
  byId = new Map(next.map((p) => [p.id, p]));
  version += 1;
  listeners.forEach((fn) => fn());
}

export function getParts(): Part[] {
  return parts;
}

export function getPartFromStore(id: string): Part | undefined {
  return byId.get(id);
}

/** For useSyncExternalStore consumers that must re-render on hydration. */
export function subscribeToParts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPartsVersion(): number {
  return version;
}
