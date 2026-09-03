/**
 * Types for the plain-JS seed module, so the SQL suite in tests/ and any
 * future TypeScript caller get a real signature instead of `any`.
 * The implementation stays JS because `npm run db:seed` runs it under
 * plain `node`, with no bundler or loader in the way.
 */

/** Anything with a pg-shaped query method: Pool, Client, or pg-mem's adapter. */
export interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
}

export interface SeedCounts {
  parts: number;
  fitment: number;
  builds: number;
}

export function toCents(dollars: number | string): number;

export function loadSeedData(): Promise<{
  parts: unknown[];
  builds: unknown[];
  fitmentEntries: Array<[string, Record<string, unknown>]>;
}>;

export function seed(
  db: Queryable,
  options?: { log?: (message: string) => void },
): Promise<SeedCounts>;
