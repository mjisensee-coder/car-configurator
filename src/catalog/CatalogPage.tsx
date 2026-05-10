import { useMemo, useState } from 'react';
import { searchParts, CATEGORIES, type SortKey } from '@/services/partsService';
import type { Part, PartCategory } from '@/types';

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

  return (
    <div className="min-h-[calc(100vh-56px)] bg-garage-grad px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-accent-gold">
            Marketplace
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Parts Catalog</h1>
          <p className="text-garage-300 mt-2 max-w-2xl">
            Genuine, OEM, and aftermarket. Every part links to a verified
            vendor. Use it as a shopping list for your build.
          </p>
        </header>

        <div className="bg-garage-800/60 border border-garage-700 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts, brands…"
            className="flex-1 min-w-[200px] bg-garage-900 border border-garage-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
          />

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
            className="bg-garage-900 border border-garage-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          >
            <option value="name">Sort: Name</option>
            <option value="price-asc">Sort: Price ↑</option>
            <option value="price-desc">Sort: Price ↓</option>
          </select>
        </div>

        <div className="text-xs text-garage-400 mb-3">
          {parts.length} part{parts.length === 1 ? '' : 's'}
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
      className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'bg-garage-700 text-garage-200 hover:bg-garage-600'
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
      className="group bg-garage-800/60 border border-garage-700 hover:border-accent rounded-2xl overflow-hidden transition-all"
    >
      <div className="aspect-square bg-garage-900 overflow-hidden">
        <img
          src={part.image}
          alt={part.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mb-1.5">
          <span className="text-accent-gold font-semibold">{part.category}</span>
          <span className="text-garage-500">·</span>
          <span className="text-garage-400">{part.vendor}</span>
        </div>
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
          {part.name}
        </h3>
        <p className="text-xs text-garage-400 mt-1">{part.brand}</p>
        <div className="flex items-baseline justify-between mt-3">
          <span className="text-lg font-bold">
            ${part.price.toLocaleString()}
          </span>
          <span className="text-xs text-accent group-hover:text-accent-hot font-semibold">
            View →
          </span>
        </div>
      </div>
    </a>
  );
}
