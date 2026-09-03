import { FALLBACK_BUILDS } from '@/data/fallbackCatalog';
import type { CommunityBuild } from '@/types';

/**
 * Client-side data access for the community gallery.
 *
 * The gallery page is server-rendered and passes builds down as props, so
 * these helpers exist for client code that needs a build outside that tree.
 * Server components should import @/server/queries directly.
 */

let builds: CommunityBuild[] = FALLBACK_BUILDS;

export function hydrateBuilds(next: CommunityBuild[] | undefined | null): void {
  if (!next || next.length === 0) return;
  builds = next;
}

export function getAllBuilds(): CommunityBuild[] {
  return builds;
}

export function getBuildById(id: string): CommunityBuild | undefined {
  return builds.find((b) => b.id === id);
}

export function getBuildsByTag(tag: string): CommunityBuild[] {
  return builds.filter((b) => b.tags.includes(tag));
}
