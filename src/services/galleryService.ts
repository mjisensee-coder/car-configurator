import builds from '@/data/communityBuilds.json';
import type { CommunityBuild } from '@/types';

/**
 * Data access for community gallery.
 * Swap this for a real database/API and the rest of the app keeps working.
 */

const BUILDS: CommunityBuild[] = builds as unknown as CommunityBuild[];

export function getAllBuilds(): CommunityBuild[] {
  return BUILDS;
}

export function getBuildById(id: string): CommunityBuild | undefined {
  return BUILDS.find((b) => b.id === id);
}

export function getBuildsByTag(tag: string): CommunityBuild[] {
  return BUILDS.filter((b) => b.tags.includes(tag));
}
