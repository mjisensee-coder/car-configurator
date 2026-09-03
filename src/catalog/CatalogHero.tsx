import { E30 } from '@/data/imageLibrary';

/** Static hero for the catalog. Server component. */
export function CatalogHero({ totalParts }: { totalParts: number }) {
  return (
    <section className="relative h-[28vh] min-h-[220px] overflow-hidden border-b border-garage-700">
      {/* eslint-disable-next-line @next/next/no-img-element */}
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
  );
}
