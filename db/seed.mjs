/**
 * Seeds the catalog into DATABASE_URL. Idempotent — safe to re-run.
 * Run `npm run db:schema` first.
 */
import { createPool, requireDatabaseUrl } from './connection.mjs';
import { seed } from './seed-data.mjs';

requireDatabaseUrl();

const pool = createPool();
try {
  const counts = await seed(pool, { log: (m) => console.log('  ' + m) });
  console.log('seeded', counts);
} catch (err) {
  console.error('seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
