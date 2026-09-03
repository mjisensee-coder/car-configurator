/**
 * Applies db/schema.sql (and the Postgres-only index file) to DATABASE_URL.
 * Idempotent — every statement is CREATE ... IF NOT EXISTS, so it is safe
 * to re-run on every deploy.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool, requireDatabaseUrl } from './connection.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));

requireDatabaseUrl();

const pool = createPool();
try {
  for (const file of ['schema.sql', 'schema-indexes-pg.sql']) {
    const sql = await readFile(path.join(dir, file), 'utf8');
    await pool.query(sql);
    console.log(`applied ${file}`);
  }
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name`,
  );
  console.log('tables:', rows.map((r) => r.table_name).join(', '));
} catch (err) {
  console.error('schema failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
