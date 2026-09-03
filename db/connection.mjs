/**
 * Shared Postgres connection config for the operational scripts
 * (apply-schema / seed). The running app has its own pooled client in
 * src/server/db.ts — this file stays dependency-light so it can run
 * under plain `node` with no bundler.
 */
import pg from 'pg';

/**
 * Railway exposes two URLs per Postgres service:
 *   - postgres://...@<name>.railway.internal:5432/railway  (private network,
 *     no TLS, what the deployed app should use — free egress)
 *   - postgres://...@<host>.proxy.rlwy.net:PORT/railway    (public proxy,
 *     TLS required, what you use from your laptop)
 * Detect which one we were handed instead of making the operator set a flag.
 */
export function connectionConfig(url = process.env.DATABASE_URL) {
  if (!url) return null;
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  const isRailwayInternal = /\.railway\.internal[:/]/.test(url);
  const disabled = /[?&]sslmode=disable\b/.test(url);
  const useSsl = !isLocal && !isRailwayInternal && !disabled;
  return {
    connectionString: url,
    // Railway's proxy presents a cert chain Node does not have a root for.
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  };
}

export function createPool(url) {
  const config = connectionConfig(url);
  if (!config) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and point it at your Postgres service.',
    );
  }
  return new pg.Pool({ ...config, max: 4 });
}

export function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    console.error(
      '\nDATABASE_URL is not set.\n\n' +
        '  Railway:  railway variables       (copy DATABASE_URL / DATABASE_PUBLIC_URL)\n' +
        '  Local:    export DATABASE_URL=postgres://user:pass@localhost:5432/e30forge\n',
    );
    process.exit(1);
  }
}
