/**
 * Seed logic, shared by `npm run db:seed` (real Postgres) and
 * `npm run db:verify` (in-memory Postgres). Takes anything with a
 * .query(text, values) method, so it works with a Pool, a Client, or
 * pg-mem's adapter.
 *
 * Every write is an UPSERT keyed on the natural id, so re-seeding an
 * existing database updates rows instead of erroring — that is what makes
 * it safe to run on each deploy.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readJson = async (rel) =>
  JSON.parse(await readFile(path.join(root, rel), 'utf8'));

/** Whole-dollar catalog prices → integer cents. */
export const toCents = (dollars) => Math.round(Number(dollars) * 100);

export async function loadSeedData() {
  const [parts, builds, fitment] = await Promise.all([
    readJson('src/data/partsCatalog.json'),
    readJson('src/data/communityBuilds.json'),
    readJson('src/data/wheelFitment.json'),
  ]);
  // Strip the leading `_comment` key used to document the fitment file.
  const fitmentEntries = Object.entries(fitment).filter(
    ([key]) => !key.startsWith('_'),
  );
  return { parts, builds, fitmentEntries };
}

export async function seed(db, { log = () => {} } = {}) {
  const { parts, builds, fitmentEntries } = await loadSeedData();

  for (const p of parts) {
    await db.query(
      `INSERT INTO parts (id, category, name, brand, price_cents, image,
                          description, vendor, affiliate_url, render_hint)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         category      = EXCLUDED.category,
         name          = EXCLUDED.name,
         brand         = EXCLUDED.brand,
         price_cents   = EXCLUDED.price_cents,
         image         = EXCLUDED.image,
         description   = EXCLUDED.description,
         vendor        = EXCLUDED.vendor,
         affiliate_url = EXCLUDED.affiliate_url,
         render_hint   = EXCLUDED.render_hint,
         updated_at    = now()`,
      [
        p.id,
        p.category,
        p.name,
        p.brand,
        toCents(p.price),
        p.image,
        p.description,
        p.vendor,
        p.affiliateUrl,
        JSON.stringify(p.renderHint ?? {}),
      ],
    );
  }
  log(`parts: ${parts.length}`);

  for (const [partId, f] of fitmentEntries) {
    await db.query(
      `INSERT INTO wheel_fitment (part_id, bolt_pattern, offset_mm, width_inches,
                                  diameter_inches, tire_size, center_bore_mm,
                                  stance, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (part_id) DO UPDATE SET
         bolt_pattern    = EXCLUDED.bolt_pattern,
         offset_mm       = EXCLUDED.offset_mm,
         width_inches    = EXCLUDED.width_inches,
         diameter_inches = EXCLUDED.diameter_inches,
         tire_size       = EXCLUDED.tire_size,
         center_bore_mm  = EXCLUDED.center_bore_mm,
         stance          = EXCLUDED.stance,
         notes           = EXCLUDED.notes`,
      [
        partId,
        f.boltPattern,
        f.offsetMm,
        f.widthInches,
        f.diameterInches,
        f.tireSize,
        f.centerBoreMm ?? null,
        f.stance ?? null,
        f.notes ?? null,
      ],
    );
  }
  log(`wheel_fitment: ${fitmentEntries.length}`);

  for (const b of builds) {
    await db.query(
      `INSERT INTO builds (id, name, creator, description, screenshot,
                           config, total_cost_cents, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         name             = EXCLUDED.name,
         creator          = EXCLUDED.creator,
         description      = EXCLUDED.description,
         screenshot       = EXCLUDED.screenshot,
         config           = EXCLUDED.config,
         total_cost_cents = EXCLUDED.total_cost_cents,
         tags             = EXCLUDED.tags`,
      [
        b.id,
        b.name,
        b.creator,
        b.description,
        b.screenshot,
        JSON.stringify(b.config),
        toCents(b.totalCost),
        b.tags ?? [],
      ],
    );
  }
  log(`builds: ${builds.length}`);

  return {
    parts: parts.length,
    fitment: fitmentEntries.length,
    builds: builds.length,
  };
}
