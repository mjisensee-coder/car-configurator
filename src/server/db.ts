import 'server-only';
import pg from 'pg';

/**
 * Pooled Postgres client for the Next server runtime.
 *
 * Two things worth knowing:
 *
 * 1. The pool is cached on `globalThis`. Next's dev server re-evaluates
 *    modules on every edit; without the cache each save would leak a pool
 *    and Postgres would run out of connections within a few minutes.
 *
 * 2. `DATABASE_URL` is optional. With no database configured every query
 *    helper in queries.ts falls back to the bundled JSON, so `npm run dev`
 *    works on a fresh clone and a database outage degrades to a
 *    last-known-good catalog instead of an error page.
 */

const globalForDb = globalThis as unknown as {
  __e30ForgePool?: pg.Pool | null;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function sslFor(url: string): pg.PoolConfig['ssl'] {
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  const isRailwayInternal = /\.railway\.internal[:/]/.test(url);
  const disabled = /[?&]sslmode=disable\b/.test(url);
  if (isLocal || isRailwayInternal || disabled) return false;
  // Railway's public proxy presents a chain Node has no root for.
  return { rejectUnauthorized: false };
}

export function getPool(): pg.Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (globalForDb.__e30ForgePool) return globalForDb.__e30ForgePool;

  const pool = new pg.Pool({
    connectionString: url,
    ssl: sslFor(url),
    // Serverless platforms open a pool per lambda instance; keep it small.
    max: Number(process.env.PGPOOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
  });
  // A pool-level error (server restart, idle connection reaped) must not
  // take the process down.
  pool.on('error', (err) => {
    console.error('[db] idle client error:', err.message);
  });
  globalForDb.__e30ForgePool = pool;
  return pool;
}

/**
 * Runs a query, returning `null` when the database is unreachable or
 * unconfigured. Callers treat `null` as "fall back to the JSON catalog",
 * which is what keeps the site up when Postgres is down.
 */
export async function tryQuery<T extends pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[] | null> {
  const pool = getPool();
  if (!pool) return null;
  try {
    const result = await pool.query<T>(text, values);
    return result.rows;
  } catch (err) {
    console.error('[db] query failed:', (err as Error).message);
    return null;
  }
}

/** Health probe used by /api/healthz. */
export async function pingDatabase(): Promise<{
  configured: boolean;
  reachable: boolean;
  error?: string;
}> {
  if (!isDatabaseConfigured()) return { configured: false, reachable: false };
  const pool = getPool();
  try {
    await pool!.query('SELECT 1');
    return { configured: true, reachable: true };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      error: (err as Error).message,
    };
  }
}
