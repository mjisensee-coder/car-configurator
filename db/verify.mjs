/**
 * Executes the real schema, the real seed statements, and the real SELECT
 * used by the app against an in-memory Postgres (pg-mem). No server needed.
 *
 * What this does and does not prove:
 *   ✓ schema.sql parses and applies
 *   ✓ every INSERT/UPSERT in seed-data.mjs runs (this is the same module
 *     `npm run db:seed` uses against production, not a copy)
 *   ✓ the PART_SELECT / BUILD_SELECT text is read out of
 *     src/server/queries.ts, so a typo in the app's join is caught here
 *   ✗ it is not a substitute for running against a real Postgres — pg-mem
 *     implements a subset (no GIN planning, looser type coercion)
 *
 * Run: npm run db:verify
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newDb } from 'pg-mem';
import { seed } from './seed-data.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..');

let failures = 0;
const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label} ${detail}`);
  }
};

/**
 * Pull a SQL constant out of the app's own source so this script tests the
 * shipped query text rather than a copy that can drift from it.
 */
async function sqlConstantFromSource(name) {
  const src = await readFile(
    path.join(root, 'src/server/queries.ts'),
    'utf8',
  );
  const match = src.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\``));
  if (!match) throw new Error(`could not find ${name} in src/server/queries.ts`);
  return match[1];
}

// noAstCoverageCheck: pg-mem throws when a `CREATE TABLE IF NOT EXISTS`
// no-ops on the second run, because it never plans the skipped constraints.
// Real Postgres handles the re-run fine, so the check is turned off rather
// than the idempotency test dropped.
const db = newDb({ noAstCoverageCheck: true, autoCreateForeignKeyIndices: true });
const { Pool } = db.adapters.createPg();
const pool = new Pool();

console.log('\nschema');
const schema = await readFile(path.join(dir, 'schema.sql'), 'utf8');
await pool.query(schema);
check('schema.sql applies', true);

// Re-applying must be a no-op — this is what makes it safe on every deploy.
await pool.query(schema);
check('schema.sql is idempotent', true);

console.log('\nseed');
const counts = await seed(pool);
check('seed runs', counts.parts > 0);
check(
  `parts seeded (${counts.parts})`,
  (await pool.query('SELECT count(*)::int AS n FROM parts')).rows[0].n ===
    counts.parts,
);
check(
  `wheel_fitment seeded (${counts.fitment})`,
  (await pool.query('SELECT count(*)::int AS n FROM wheel_fitment')).rows[0]
    .n === counts.fitment,
);
check(
  `builds seeded (${counts.builds})`,
  (await pool.query('SELECT count(*)::int AS n FROM builds')).rows[0].n ===
    counts.builds,
);

// Re-seeding must update in place, not duplicate or throw.
await seed(pool);
check(
  'seed is idempotent (upsert, no duplicates)',
  (await pool.query('SELECT count(*)::int AS n FROM parts')).rows[0].n ===
    counts.parts,
);

console.log('\nqueries (SQL read from src/server/queries.ts)');
const PART_SELECT = await sqlConstantFromSource('PART_SELECT');
const BUILD_SELECT = await sqlConstantFromSource('BUILD_SELECT');

const all = await pool.query(`${PART_SELECT} ORDER BY p.name ASC`);
check(`PART_SELECT joins fitment (${all.rows.length} rows)`, all.rows.length === counts.parts);

const wheels = all.rows.filter((r) => r.bolt_pattern !== null);
check(
  `fitment joined onto ${counts.fitment} wheels only`,
  wheels.length === counts.fitment,
);
check(
  'fitment columns populated',
  wheels.every(
    (w) =>
      w.bolt_pattern === '4x100' &&
      w.offset_mm !== null &&
      w.width_inches !== null &&
      w.tire_size !== null,
  ),
  JSON.stringify(wheels[0] ?? {}),
);

const byId = await pool.query(`${PART_SELECT} WHERE p.id = $1`, [
  'wheels-bbs-rs',
]);
check('lookup by id', byId.rows.length === 1 && byId.rows[0].name.includes('BBS'));

const byCategory = await pool.query(
  `${PART_SELECT} WHERE p.category = $1 ORDER BY p.name ASC`,
  ['wheels'],
);
check(`category filter (${byCategory.rows.length} wheels)`, byCategory.rows.length === counts.fitment);

const search = await pool.query(
  `${PART_SELECT} WHERE (p.name ILIKE $1 OR p.brand ILIKE $1 OR p.description ILIKE $1)
   ORDER BY p.price_cents ASC, p.name ASC`,
  ['%bbs%'],
);
check(`ILIKE search matches (${search.rows.length})`, search.rows.length >= 1);

const priced = await pool.query(
  `${PART_SELECT} WHERE p.price_cents <= $1 ORDER BY p.price_cents DESC, p.name ASC`,
  [200000],
);
check(
  'price filter + sort',
  priced.rows.length > 0 &&
    priced.rows.every((r) => r.price_cents <= 200000) &&
    priced.rows[0].price_cents >= priced.rows[priced.rows.length - 1].price_cents,
);

const fitmentQuery = await pool.query(
  `${PART_SELECT} WHERE f.part_id IS NOT NULL AND f.bolt_pattern = $1
     AND f.diameter_inches = $2
   ORDER BY f.diameter_inches ASC, f.width_inches ASC, p.name ASC`,
  ['4x100', 15],
);
check(
  `fitment query 4x100 / 15in (${fitmentQuery.rows.length} matches)`,
  fitmentQuery.rows.length === 2,
);

const builds = await pool.query(
  `${BUILD_SELECT} ORDER BY created_at DESC, name ASC`,
);
check(`BUILD_SELECT (${builds.rows.length} rows)`, builds.rows.length === counts.builds);
check(
  'build config round-trips as JSONB',
  typeof builds.rows[0].config === 'object' &&
    typeof builds.rows[0].config.paintId === 'string',
);

const tagged = await pool.query(
  `${BUILD_SELECT} WHERE $1 = ANY(tags) ORDER BY name ASC`,
  ['track'],
);
check(`tag filter ANY(tags) (${tagged.rows.length})`, tagged.rows.length >= 1);

const cents = await pool.query(
  'SELECT price_cents FROM parts WHERE id = $1',
  ['wheels-bbs-rs'],
);
check(
  'money stored as integer cents (2899.00 → 289900)',
  cents.rows[0].price_cents === 289900,
);

await pool.end();
console.log(
  failures === 0
    ? '\nall checks passed\n'
    : `\n${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
