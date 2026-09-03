import Link from 'next/link';
import type { Part } from '@/types';

/**
 * Catalog tile. A server component — no hooks, no interactivity — so it
 * renders to static HTML a crawler can read.
 *
 * The card links to the internal part page rather than straight out to the
 * vendor. That page carries the Product structured data and the outbound
 * affiliate link, so the crawlable surface stays on our domain.
 */
export function PartCard({ part }: { part: Part }) {
  return (
    <Link
      href={`/parts/${part.id}`}
      className="group bg-garage-800/60 border border-garage-700 hover:border-accent rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-glow duration-300 flex flex-col"
    >
      <div className="relative aspect-[5/4] bg-garage-900 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
      <div className="p-4 flex flex-col flex-1">
        <p className="text-[10px] uppercase tracking-wider text-garage-400 mb-1">
          {part.vendor}
        </p>
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
          {part.name}
        </h3>
        <p className="text-xs text-garage-400 mt-1">{part.brand}</p>

        {part.fitment && (
          <p className="mt-2 text-[11px] font-mono text-garage-300 bg-garage-900/70 border border-garage-700 rounded px-2 py-1">
            {part.fitment.diameterInches}×{part.fitment.widthInches} ET
            {part.fitment.offsetMm} · {part.fitment.boltPattern}
          </p>
        )}

        <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-garage-700 mt-auto">
          <span className="text-lg font-bold">
            ${part.price.toLocaleString()}
          </span>
          <span className="text-xs text-accent group-hover:text-accent-hot font-semibold tracking-wide transition-transform group-hover:translate-x-0.5">
            Details →
          </span>
        </div>
      </div>
    </Link>
  );
}
