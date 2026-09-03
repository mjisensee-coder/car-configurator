import type { Metadata } from 'next';
import { searchParts } from '@/server/queries';
import { CatalogFilters } from '@/catalog/CatalogFilters';
import { PartCard } from '@/catalog/PartCard';
import { CatalogHero } from '@/catalog/CatalogHero';
import { Footer } from '@/components/Footer';
import { CATEGORIES } from '@/services/partsService';
import type { PartCategory, SortKey } from '@/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORTS: SortKey[] = ['name', 'price-asc', 'price-desc'];

/** Query strings are user input — coerce them into the domain types. */
function parseParams(raw: Record<string, string | string[] | undefined>) {
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? '';
  const rawCategory = one(raw.category);
  const rawSort = one(raw.sort) as SortKey;
  return {
    category: (CATEGORIES as string[]).includes(rawCategory)
      ? (rawCategory as PartCategory)
      : ('all' as const),
    search: one(raw.q).slice(0, 100),
    sort: SORTS.includes(rawSort) ? rawSort : ('name' as SortKey),
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { category, search } = parseParams(await searchParams);
  const scope = category === 'all' ? 'parts' : category;
  const title = search
    ? `${search} — E30 ${scope}`
    : category === 'all'
      ? 'Parts catalog'
      : `E30 ${scope}`;

  return {
    title,
    description: `Browse BMW E30 ${scope} with prices, specs and verified vendor links. Wheels list full fitment: bolt pattern, offset, width and tire size.`,
    // Filtered views are variations of one page — point them all at the
    // canonical catalog so they do not compete with each other in search.
    alternates: { canonical: '/catalog' },
    robots: search ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category, search, sort } = parseParams(await searchParams);

  // Both queries run on the server against Postgres. The grid below is
  // therefore in the initial HTML — no client fetch, no loading state.
  const [parts, allParts] = await Promise.all([
    searchParts(
      {
        category: category === 'all' ? undefined : category,
        search: search || undefined,
      },
      sort,
    ),
    searchParts({}, 'name'),
  ]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-garage-950">
      <CatalogHero totalParts={allParts.length} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <CatalogFilters category={category} search={search} sort={sort} />

        <div className="text-xs text-garage-400 mb-3 px-1">
          Showing {parts.length} of {allParts.length} parts
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {parts.map((p) => (
            <PartCard key={p.id} part={p} />
          ))}
        </div>

        {parts.length === 0 && (
          <div className="text-center text-garage-400 py-20">
            No parts match your search.
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
