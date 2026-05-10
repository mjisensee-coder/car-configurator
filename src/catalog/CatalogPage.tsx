import { useMemo, useState } from 'react';
import { searchParts, CATEGORIES, type SortKey } from '@/services/partsService';
import type { Part, PartCategory } from '@/types';
import { E30 } from '@/data/imageLibrary';

export function CatalogPage() {
  const [category, setCategory] = useState<PartCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');

  const parts = useMemo(
    () =>
      searchParts(
        {
          search: search || undefined,
          category: category === 'all' ? undefined : category,
        },
        sort,
      ),
    [search, category, sort],
  );

  const totalParts = useMemo(() => searchParts({}).length, []);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-garage-950">
      {/* Hero */}
      <section className="relative h-[28vh] min-h-[220px] overflow-hidden border-b border-garage-700">
        <img
          src={E30.heroRed}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-garage-950 via-garage-950/70 to-garage-950/30" />

        <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-7">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-gold">
            Marketplace
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 tracking-tight">
            Parts catalog.
          </h1>
          <p className="text-garage-200 mt-2 max-w-xl text-base leading-relaxed">
            Genuine, OEM, and aftermarket. Every part links to a verified
            vendor.
          </p>
          <div className="mt-3 text-xs uppercase tracking-wider text-garage-300">
            <span className="text-garage-100 font-bold text-base font-mono">
              {totalParts}
            </span>{' '}
            parts in stock
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter bar */}
        <div className="bg-garage-800/60 border border-garage-700 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3 sticky top-[56px] z-20 backdrop-blur-md">
          <div className="relative flex-1 min-w-[200px]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-garage-400 pointer-events-none"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search parts, brands…"
              className="w-full bg-garage-900 border border-garage-600 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>
              All
            </CategoryChip>
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </CategoryChip>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-garage-900 border border-garage-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          >
            <option value="name">Sort: Name</option>
            <option value="price-asc">Sort: Price ↑</option>
            <option value="price-desc">Sort: Price ↓</option>
          </select>
        </div>

        <div className="text-xs text-garage-400 mb-3 px-1">
          Showing {parts.length} of {totalParts} parts
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
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
        active
          ? 'bg-accent text-white shadow-glow'
          : 'bg-garage-700 text-garage-200 hover:bg-garage-600 border border-garage-600/60'
      }`}
    >
      {children}
    </button>
  );
}

function PartCard({ part }: { part: Part }) {
  return (
    <a
      href={part.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-garage-800/60 border border-garage-700 hover:border-accent rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-glow duration-300"
    >
      <div className="relative aspect-[5/4] bg-garage-900 overflow-hidden">
        <img
          src={part.image}
          alt={part.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-garage-950/70 via-transparent to-transparent" />
        <div className="absolute top-2.5 left-2.5 bg-garage-950/80 backdrop-blur border border-garage-600/60 text-[10px] uppercase tracking-wider font-bold text-accent-gold px-2 py-0.5 rounded">
          {part.category}
        </div>
      </div>
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-garage-400 mb-1">
          {part.vendor}
        </p>
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
          {part.name}
        </h3>
        <p className="text-xs text-garage-400 mt-1">{part.brand}</p>
        <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-garage-700">
          <span className="text-lg font-bold">
            ${part.price.toLocaleString()}
          </span>
          <span className="text-xs text-accent group-hover:text-accent-hot font-semibold tracking-wide transition-transform group-hover:translate-x-0.5">
            View →
          </span>
        </div>
      </div>
    </a>
  );
}
