import 'server-only';
import type {
  CommunityBuild,
  FitmentFacets,
  FitmentFilter,
  Part,
  PartCategory,
  PartFilter,
  SortKey,
  WheelFitment,
} from '@/types';
import { tryQuery } from './db';
import { FALLBACK_BUILDS, FALLBACK_PARTS } from '@/data/fallbackCatalog';

/**
 * The only module that writes SQL.
 *
 * Every export returns the same domain types the app used when the catalog
 * was a JSON file, and every export degrades to the bundled JSON when
 * `tryQuery` returns null (no DATABASE_URL, or Postgres unreachable). That
 * is the swap point CLAUDE.md promised: pages and components never learn
 * where the data came from.
 */

// ── row shapes ─────────────────────────────────────────────────────────

interface PartRow {
  id: string;
  category: string;
  name: string;
  brand: string;
  price_cents: number;
  image: string;
  description: string;
  vendor: string;
  affiliate_url: string;
  render_hint: Record<string, string | number> | null;
  bolt_pattern: string | null;
  offset_mm: number | null;
  width_inches: string | number | null;
  diameter_inches: string | number | null;
  tire_size: string | null;
  center_bore_mm: string | number | null;
  stance: string | null;
  fitment_notes: string | null;
}

interface BuildRow {
  id: string;
  name: string;
  creator: string;
  description: string;
  screenshot: string;
  config: CommunityBuild['config'];
  total_cost_cents: number;
  tags: string[];
}

// pg returns NUMERIC as a string to avoid float precision loss; the domain
// types want numbers.
const num = (v: string | number | null): number | undefined =>
  v === null || v === undefined ? undefined : Number(v);

function toPart(row: PartRow): Part {
  const part: Part = {
    id: row.id,
    category: row.category as PartCategory,
    name: row.name,
    brand: row.brand,
    price: row.price_cents / 100,
    image: row.image,
    description: row.description,
    vendor: row.vendor as Part['vendor'],
    affiliateUrl: row.affiliate_url,
    renderHint: row.render_hint ?? undefined,
  };
  if (row.bolt_pattern) {
    const fitment: WheelFitment = {
      boltPattern: row.bolt_pattern,
      offsetMm: Number(row.offset_mm),
      widthInches: num(row.width_inches)!,
      diameterInches: num(row.diameter_inches)!,
      tireSize: row.tire_size ?? '',
      centerBoreMm: num(row.center_bore_mm),
      stance: (row.stance as WheelFitment['stance']) ?? undefined,
      notes: row.fitment_notes ?? undefined,
    };
    part.fitment = fitment;
  }
  return part;
}

function toBuild(row: BuildRow): CommunityBuild {
  return {
    id: row.id,
    name: row.name,
    creator: row.creator,
    description: row.description,
    screenshot: row.screenshot,
    config: row.config,
    totalCost: row.total_cost_cents / 100,
    tags: row.tags ?? [],
  };
}

/** Every part query selects this shape, so they share one row mapper. */
const PART_SELECT = `
  SELECT p.id, p.category, p.name, p.brand, p.price_cents, p.image,
         p.description, p.vendor, p.affiliate_url, p.render_hint,
         f.bolt_pattern, f.offset_mm, f.width_inches, f.diameter_inches,
         f.tire_size, f.center_bore_mm, f.stance, f.notes AS fitment_notes
    FROM parts p
    LEFT JOIN wheel_fitment f ON f.part_id = p.id`;

// Whitelist — `sort` arrives from a query string and can never be
// interpolated into SQL directly.
const ORDER_BY: Record<SortKey, string> = {
  'price-asc': 'p.price_cents ASC, p.name ASC',
  'price-desc': 'p.price_cents DESC, p.name ASC',
  name: 'p.name ASC',
};

// ── parts ──────────────────────────────────────────────────────────────

export async function getAllParts(): Promise<Part[]> {
  const rows = await tryQuery<PartRow>(`${PART_SELECT} ORDER BY p.name ASC`);
  if (!rows) return sortParts(FALLBACK_PARTS, 'name');
  return rows.map(toPart);
}

export async function getPartById(id: string): Promise<Part | undefined> {
  const rows = await tryQuery<PartRow>(`${PART_SELECT} WHERE p.id = $1`, [id]);
  if (!rows) return FALLBACK_PARTS.find((p) => p.id === id);
  return rows[0] ? toPart(rows[0]) : undefined;
}

export async function getPartsByCategory(
  category: PartCategory,
): Promise<Part[]> {
  const rows = await tryQuery<PartRow>(
    `${PART_SELECT} WHERE p.category = $1 ORDER BY p.name ASC`,
    [category],
  );
  if (!rows) {
    return sortParts(
      FALLBACK_PARTS.filter((p) => p.category === category),
      'name',
    );
  }
  return rows.map(toPart);
}

export async function searchParts(
  filter: PartFilter = {},
  sort: SortKey = 'name',
): Promise<Part[]> {
  const where: string[] = [];
  const values: unknown[] = [];

  if (filter.category) {
    values.push(filter.category);
    where.push(`p.category = $${values.length}`);
  }
  if (filter.search) {
    values.push(`%${filter.search}%`);
    const i = values.length;
    where.push(
      `(p.name ILIKE $${i} OR p.brand ILIKE $${i} OR p.description ILIKE $${i})`,
    );
  }
  if (typeof filter.maxPrice === 'number') {
    values.push(Math.round(filter.maxPrice * 100));
    where.push(`p.price_cents <= $${values.length}`);
  }

  const sql = `${PART_SELECT}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${ORDER_BY[sort] ?? ORDER_BY.name}`;

  const rows = await tryQuery<PartRow>(sql, values);
  if (!rows) return searchPartsInMemory(FALLBACK_PARTS, filter, sort);
  return rows.map(toPart);
}

// ── wheel fitment ──────────────────────────────────────────────────────

/**
 * "Will this fit?" as a query rather than a paragraph of prose. Returns
 * wheels matching the spec plus facet counts, so a filter UI can grey out
 * the combinations that would return nothing.
 */
export async function searchWheelsByFitment(
  filter: FitmentFilter = {},
): Promise<{ parts: Part[]; facets: FitmentFacets }> {
  const where: string[] = ['f.part_id IS NOT NULL'];
  const values: unknown[] = [];

  if (filter.boltPattern) {
    values.push(filter.boltPattern);
    where.push(`f.bolt_pattern = $${values.length}`);
  }
  if (typeof filter.diameterInches === 'number') {
    values.push(filter.diameterInches);
    where.push(`f.diameter_inches = $${values.length}`);
  }
  if (typeof filter.widthInches === 'number') {
    values.push(filter.widthInches);
    where.push(`f.width_inches = $${values.length}`);
  }
  if (typeof filter.minOffsetMm === 'number') {
    values.push(filter.minOffsetMm);
    where.push(`f.offset_mm >= $${values.length}`);
  }
  if (typeof filter.maxOffsetMm === 'number') {
    values.push(filter.maxOffsetMm);
    where.push(`f.offset_mm <= $${values.length}`);
  }

  const rows = await tryQuery<PartRow>(
    `${PART_SELECT} WHERE ${where.join(' AND ')}
     ORDER BY f.diameter_inches ASC, f.width_inches ASC, p.name ASC`,
    values,
  );

  const parts = rows
    ? rows.map(toPart)
    : filterFitmentInMemory(FALLBACK_PARTS, filter);

  return { parts, facets: buildFacets(parts) };
}

/** Facets are counted over the result set, so they always reflect the query. */
function buildFacets(parts: Part[]): FitmentFacets {
  const tally = <T extends string | number>(pick: (f: WheelFitment) => T) => {
    const counts = new Map<T, number>();
    for (const p of parts) {
      if (!p.fitment) continue;
      const value = pick(p.fitment);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts, ([value, count]) => ({ value, count })).sort(
      (a, b) =>
        typeof a.value === 'number' && typeof b.value === 'number'
          ? a.value - b.value
          : String(a.value).localeCompare(String(b.value)),
    );
  };
  return {
    boltPattern: tally((f) => f.boltPattern),
    diameterInches: tally((f) => f.diameterInches),
    widthInches: tally((f) => f.widthInches),
    tireSize: tally((f) => f.tireSize),
  };
}

// ── builds ─────────────────────────────────────────────────────────────

const BUILD_SELECT = `
  SELECT id, name, creator, description, screenshot, config,
         total_cost_cents, tags
    FROM builds`;

export async function getAllBuilds(): Promise<CommunityBuild[]> {
  const rows = await tryQuery<BuildRow>(
    `${BUILD_SELECT} ORDER BY created_at DESC, name ASC`,
  );
  if (!rows) return FALLBACK_BUILDS;
  return rows.map(toBuild);
}

export async function getBuildById(
  id: string,
): Promise<CommunityBuild | undefined> {
  const rows = await tryQuery<BuildRow>(`${BUILD_SELECT} WHERE id = $1`, [id]);
  if (!rows) return FALLBACK_BUILDS.find((b) => b.id === id);
  return rows[0] ? toBuild(rows[0]) : undefined;
}

export async function getBuildsByTag(tag: string): Promise<CommunityBuild[]> {
  const rows = await tryQuery<BuildRow>(
    `${BUILD_SELECT} WHERE $1 = ANY(tags) ORDER BY name ASC`,
    [tag],
  );
  if (!rows) return FALLBACK_BUILDS.filter((b) => b.tags.includes(tag));
  return rows.map(toBuild);
}

// ── in-memory equivalents, used only on the fallback path ──────────────

function sortParts(parts: Part[], sort: SortKey): Part[] {
  const out = parts.slice();
  switch (sort) {
    case 'price-asc':
      out.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
      break;
    case 'price-desc':
      out.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
      break;
    default:
      out.sort((a, b) => a.name.localeCompare(b.name));
  }
  return out;
}

function searchPartsInMemory(
  parts: Part[],
  filter: PartFilter,
  sort: SortKey,
): Part[] {
  let out = parts;
  if (filter.category) out = out.filter((p) => p.category === filter.category);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    out = out.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }
  if (typeof filter.maxPrice === 'number') {
    out = out.filter((p) => p.price <= filter.maxPrice!);
  }
  return sortParts(out, sort);
}

function filterFitmentInMemory(parts: Part[], f: FitmentFilter): Part[] {
  return parts
    .filter((p): p is Part & { fitment: WheelFitment } => Boolean(p.fitment))
    .filter((p) => !f.boltPattern || p.fitment.boltPattern === f.boltPattern)
    .filter(
      (p) =>
        f.diameterInches === undefined ||
        p.fitment.diameterInches === f.diameterInches,
    )
    .filter(
      (p) =>
        f.widthInches === undefined || p.fitment.widthInches === f.widthInches,
    )
    .filter(
      (p) => f.minOffsetMm === undefined || p.fitment.offsetMm >= f.minOffsetMm,
    )
    .filter(
      (p) => f.maxOffsetMm === undefined || p.fitment.offsetMm <= f.maxOffsetMm,
    )
    .sort(
      (a, b) =>
        a.fitment.diameterInches - b.fitment.diameterInches ||
        a.fitment.widthInches - b.fitment.widthInches ||
        a.name.localeCompare(b.name),
    );
}
