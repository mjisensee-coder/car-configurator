'use client';

import type { ReactNode } from 'react';
import type { CommunityBuild, Part } from '@/types';
import { hydrateParts } from './partsStore';
import { hydrateBuilds } from './galleryService';

/**
 * Fills the client stores with rows fetched by a server component.
 *
 * Hydration happens in the render body rather than an effect: React renders
 * a parent before its children, so the store is populated before any
 * consumer reads it — on the server pass and in the browser. Both hydrate
 * functions ignore empty payloads and no-op on repeat calls, so this stays
 * safe under re-renders and Strict Mode double-invocation.
 */
export function CatalogHydrator({
  parts,
  builds,
  children,
}: {
  parts?: Part[];
  builds?: CommunityBuild[];
  children: ReactNode;
}) {
  hydrateParts(parts);
  hydrateBuilds(builds);
  return <>{children}</>;
}
