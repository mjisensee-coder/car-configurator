import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { newDb, type IMemoryDb } from 'pg-mem';
// The same module `npm run db:seed` runs against production, not a copy.
import { seed } from '../db/seed-data.mjs';

/**
 * Runs the real schema, the real seed statements and the app's own SELECT
 * text against an in-memory Postgres.
 *
 * What this proves: schema.sql applies and is idempotent, every
 * INSERT/UPSERT in the seed runs, and the joins in queries.ts are valid
 * SQL against that schema. What it does not: pg-mem implements a subset
 * (no GIN planning, looser coercion), so it is not a substitute for
 * running against a real server before a production deploy.
 */

const root = path.resolve(import.meta.dirname, '..');

/**
 * Reads a SQL constant out of the app's source so this file tests the
 * shipped query text. A copy here would pass while production broke.
 */
async function sqlConstantFromSource(name: string): Promise<string> {
  const src = await readFile(path.join(root, 'src/server/queries.ts'), 'utf8');
  const match = src.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\``));
  if (!match) throw new Error(`could not find ${name} in src/server/queries.ts`);
  return match[1];
}

interface Pool {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>;
  end?: () => Promise<void>;
}

let pool: Pool;
let db: IMemoryDb;
let counts: { parts: number; fitment: number; builds: number };
let PART_SELECT: string;
let BUILD_SELECT: string;
let schema: string;

beforeAll(async () => {
  // noAstCoverageCheck: pg-mem throws when `CREATE TABLE IF NOT EXISTS`
  // no-ops on a re-run, because it never plans the skipped constraints.
  // Real Postgres handles the re-run, so the check is off rather than the
  // idempotency test dropped.
  db = newDb({ noAstCoverageCheck: true, autoCreateForeignKeyIndices: true });
  const { Pool } = db.adapters.createPg();
  pool = new Pool() as unknown as Pool;

  schema = await readFile(path.join(root, 'db/schema.sql'), 'utf8');
  await pool.query(schema);
  counts = await seed(pool);

  PART_SELECT = await sqlConstantFromSource('PART_SELECT');
  BUILD_SELECT = await sqlConstantFromSource('BUILD_SELECT');
});

describe('schema', () => {
  it('creates the three tables', async () => {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name`,
    );
    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining(['builds', 'parts', 'wheel_fitment']),
    );
  });

  it('re-applies cleanly, so it is safe on every deploy', async () => {
    await expect(pool.query(schema)).resolves.toBeTruthy();
  });
});

describe('seed', () => {
  it('loads every part, fitment row and build', async () => {
    const partCount = await pool.query('SELECT count(*)::int AS n FROM parts');
    const fitmentCount = await pool.query(
      'SELECT count(*)::int AS n FROM wheel_fitment',
    );
    const buildCount = await pool.query('SELECT count(*)::int AS n FROM builds');
    expect(partCount.rows[0].n).toBe(counts.parts);
    expect(fitmentCount.rows[0].n).toBe(counts.fitment);
    expect(buildCount.rows[0].n).toBe(counts.builds);
  });

  it('upserts on a re-run instead of duplicating', async () => {
    await seed(pool);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM parts');
    expect(rows[0].n).toBe(counts.parts);
  });

  it('stores money as integer cents', async () => {
    const { rows } = await pool.query(
      'SELECT price_cents FROM parts WHERE id = $1',
      ['wheels-bbs-rs'],
    );
    expect(rows[0].price_cents).toBe(289900);
  });

  it('keeps a build config as queryable JSONB', async () => {
    const { rows } = await pool.query('SELECT config FROM builds LIMIT 1');
    expect(typeof rows[0].config).toBe('object');
    expect(typeof rows[0].config.paintId).toBe('string');
  });
});

describe("the app's own SELECT text", () => {
  it('joins fitment onto parts without dropping rows', async () => {
    const { rows } = await pool.query(`${PART_SELECT} ORDER BY p.name ASC`);
    expect(rows).toHaveLength(counts.parts);
  });

  it('attaches fitment to wheels only', async () => {
    const { rows } = await pool.query(`${PART_SELECT} ORDER BY p.name ASC`);
    const withFitment = rows.filter((r) => r.bolt_pattern !== null);
    expect(withFitment).toHaveLength(counts.fitment);
    expect(
      withFitment.every(
        (w) =>
          w.bolt_pattern === '4x100' &&
          w.offset_mm !== null &&
          w.width_inches !== null &&
          w.tire_size !== null,
      ),
    ).toBe(true);
  });

  it('looks up a single part by id', async () => {
    const { rows } = await pool.query(`${PART_SELECT} WHERE p.id = $1`, [
      'wheels-bbs-rs',
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toContain('BBS');
  });

  it('filters by category', async () => {
    const { rows } = await pool.query(
      `${PART_SELECT} WHERE p.category = $1 ORDER BY p.name ASC`,
      ['wheels'],
    );
    expect(rows).toHaveLength(counts.fitment);
  });

  it('matches ILIKE search', async () => {
    const { rows } = await pool.query(
      `${PART_SELECT} WHERE (p.name ILIKE $1 OR p.brand ILIKE $1 OR p.description ILIKE $1)`,
      ['%bbs%'],
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('applies the price ceiling and descending sort', async () => {
    const { rows } = await pool.query(
      `${PART_SELECT} WHERE p.price_cents <= $1 ORDER BY p.price_cents DESC, p.name ASC`,
      [200000],
    );
    expect(rows.length).toBeGreaterThan(0);
    const prices = rows.map((r) => r.price_cents);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    expect(prices.every((p) => p <= 200000)).toBe(true);
  });

  it('answers a fitment query', async () => {
    const { rows } = await pool.query(
      `${PART_SELECT} WHERE f.part_id IS NOT NULL AND f.bolt_pattern = $1
         AND f.diameter_inches = $2
       ORDER BY f.diameter_inches ASC, f.width_inches ASC, p.name ASC`,
      ['4x100', 15],
    );
    expect(rows).toHaveLength(2);
  });

  it('selects builds and filters them by tag', async () => {
    const all = await pool.query(
      `${BUILD_SELECT} ORDER BY created_at DESC, name ASC`,
    );
    expect(all.rows).toHaveLength(counts.builds);

    const tagged = await pool.query(
      `${BUILD_SELECT} WHERE $1 = ANY(tags) ORDER BY name ASC`,
      ['track'],
    );
    expect(tagged.rows.length).toBeGreaterThan(0);
  });
});

describe('referential integrity', () => {
  it('removes a wheel’s fitment row when the part is deleted', async () => {
    await pool.query(
      `INSERT INTO parts (id, category, name, brand, price_cents, image,
                          description, vendor, affiliate_url)
       VALUES ('tmp-wheel','wheels','Tmp','Tmp',1000,'i','d','ECS Tuning','u')`,
    );
    await pool.query(
      `INSERT INTO wheel_fitment (part_id, bolt_pattern, offset_mm,
                                  width_inches, diameter_inches, tire_size)
       VALUES ('tmp-wheel','4x100',30,7,15,'195/50R15')`,
    );
    await pool.query(`DELETE FROM parts WHERE id = 'tmp-wheel'`);
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM wheel_fitment WHERE part_id = 'tmp-wheel'`,
    );
    expect(rows[0].n).toBe(0);
  });
});
