import partsCatalog from '@/data/partsCatalog.json';
import communityBuilds from '@/data/communityBuilds.json';
import wheelFitment from '@/data/wheelFitment.json';
import type { CommunityBuild, Part, WheelFitment } from '@/types';

/**
 * Last-known-good catalog, compiled into the bundle.
 *
 * This is the same JSON the app shipped with before Postgres existed. It
 * now serves two jobs: it lets a fresh clone run with no DATABASE_URL, and
 * it keeps the catalog and gallery rendering if Postgres is unreachable.
 * `db/seed.mjs` loads the exact same files, so the fallback and the seeded
 * database never disagree on a fresh deploy.
 */

const FITMENT = wheelFitment as unknown as Record<string, WheelFitment>;

export const FALLBACK_PARTS: Part[] = (partsCatalog as unknown as Part[]).map(
  (part) => {
    const fitment = FITMENT[part.id];
    return fitment ? { ...part, fitment } : part;
  },
);

export const FALLBACK_BUILDS: CommunityBuild[] =
  communityBuilds as unknown as CommunityBuild[];
