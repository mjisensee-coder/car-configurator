'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CATEGORIES } from '@/services/partsService';
import type { PartCategory, SortKey } from '@/types';

/**
 * Filter controls for the catalog.
 *
 * State lives in the URL, not in React: every change rewrites the query
 * string and the server re-queries Postgres and re-renders the grid. That
 * is what makes /catalog?category=wheels a real, shareable, indexable page
 * instead of a client-side view of one page.
 *
 * The search box is debounced so typing does not fire a request per
 * keystroke, and updates run in a transition so the current results stay
 * on screen (dimmed) rather than flashing a spinner.
 */
export function CatalogFilters({
  category,
  search,
  sort,
}: {
  category: PartCategory | 'all';
  search: string;
  sort: SortKey;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);

  // Keep the box in sync when the URL changes from elsewhere (back button).
  useEffect(() => setSearchDraft(search), [search]);

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (searchDraft === search) return;
    const timer = setTimeout(() => pushParams({ q: searchDraft || null }), 300);
    return () => clearTimeout(timer);
  }, [searchDraft, search, pushParams]);

  return (
    <div
      className={`bg-garage-800/60 border border-garage-700 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3 sticky top-[56px] z-20 backdrop-blur-md transition-opacity ${
        isPending ? 'opacity-60' : 'opacity-100'
      }`}
    >
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
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Search parts, brands…"
          aria-label="Search parts"
          className="w-full bg-garage-900 border border-garage-600 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CategoryChip
          active={category === 'all'}
          onClick={() => pushParams({ category: null })}
        >
          All
        </CategoryChip>
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c}
            active={category === c}
            onClick={() => pushParams({ category: c })}
          >
            {c}
          </CategoryChip>
        ))}
      </div>

      <select
        value={sort}
        onChange={(e) => pushParams({ sort: e.target.value })}
        aria-label="Sort parts"
        className="bg-garage-900 border border-garage-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
      >
        <option value="name">Sort: Name</option>
        <option value="price-asc">Sort: Price ↑</option>
        <option value="price-desc">Sort: Price ↓</option>
      </select>
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
      type="button"
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
