import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllParts, getPartById, getPartsByCategory } from '@/server/queries';
import { PartCard } from '@/catalog/PartCard';
import { Footer } from '@/components/Footer';
import type { Part } from '@/types';

type Params = Promise<{ id: string }>;

// Refresh price and copy changes without a redeploy.
export const revalidate = 300;

/**
 * Pre-render every part at build time. This is the whole point of the Next
 * move: 28 part pages that exist as static HTML with their own title,
 * description and Product markup, instead of one JS bundle that a crawler
 * has to execute to see anything.
 */
export async function generateStaticParams() {
  const parts = await getAllParts();
  return parts.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const part = await getPartById(id);
  if (!part) return { title: 'Part not found', robots: { index: false } };

  const fitment = part.fitment
    ? ` ${part.fitment.diameterInches}×${part.fitment.widthInches} ET${part.fitment.offsetMm}, ${part.fitment.boltPattern}, ${part.fitment.tireSize}.`
    : '';

  return {
    title: `${part.name} — ${part.brand}`,
    description: `${part.description}${fitment} $${part.price.toLocaleString()} from ${part.vendor}.`,
    alternates: { canonical: `/parts/${part.id}` },
    openGraph: {
      type: 'website',
      title: `${part.name} — ${part.brand}`,
      description: part.description,
      url: `/parts/${part.id}`,
      images: [{ url: part.image, alt: part.name }],
    },
  };
}

export default async function PartPage({ params }: { params: Params }) {
  const { id } = await params;
  const part = await getPartById(id);
  if (!part) notFound();

  const related = (await getPartsByCategory(part.category))
    .filter((p) => p.id !== part.id)
    .slice(0, 4);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-garage-950">
      <ProductJsonLd part={part} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-wider text-garage-400 mb-6 flex items-center gap-2"
        >
          <Link href="/catalog" className="hover:text-garage-200">
            Catalog
          </Link>
          <span className="text-garage-600">/</span>
          <Link
            href={`/catalog?category=${part.category}`}
            className="hover:text-garage-200"
          >
            {part.category}
          </Link>
          <span className="text-garage-600">/</span>
          <span className="text-garage-200">{part.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
          <div className="rounded-2xl overflow-hidden border border-garage-700 bg-garage-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={part.image}
              alt={part.name}
              className="w-full h-full object-cover aspect-[4/3]"
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-gold">
              {part.brand}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">
              {part.name}
            </h1>
            <p className="text-garage-200 mt-4 leading-relaxed">
              {part.description}
            </p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-4xl font-bold">
                ${part.price.toLocaleString()}
              </span>
              <span className="text-sm text-garage-400">via {part.vendor}</span>
            </div>

            {part.fitment && <FitmentTable part={part} />}

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={part.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="bg-gradient-to-r from-accent to-accent-hot text-white font-semibold px-6 py-3 rounded-xl shadow-glow hover:brightness-110 transition"
              >
                Buy at {part.vendor} →
              </a>
              <Link
                href="/configure"
                className="border border-garage-600 hover:border-accent text-garage-100 font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Open build studio
              </Link>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold mb-4 tracking-tight">
              More {part.category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((p) => (
                <PartCard key={p.id} part={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}

/**
 * Fitment spec table. These are the columns from `wheel_fitment` — the
 * fields that decide whether the wheel bolts on, presented as a spec sheet
 * rather than buried in prose.
 */
function FitmentTable({ part }: { part: Part }) {
  const f = part.fitment!;
  const rows: Array<[string, string]> = [
    ['Bolt pattern', f.boltPattern],
    ['Diameter', `${f.diameterInches}"`],
    ['Width', `${f.widthInches}"`],
    ['Offset', `ET${f.offsetMm}`],
    ['Tire size', f.tireSize],
  ];
  if (f.centerBoreMm) rows.push(['Centre bore', `${f.centerBoreMm} mm`]);
  if (f.stance) rows.push(['Stance', f.stance]);

  return (
    <div className="mt-6 border border-garage-700 rounded-xl overflow-hidden">
      <div className="bg-garage-800/70 px-4 py-2 text-xs uppercase tracking-wider text-garage-300 font-semibold">
        Fitment
      </div>
      <dl className="divide-y divide-garage-700">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-2 text-sm">
            <dt className="text-garage-400">{label}</dt>
            <dd className="font-mono text-garage-100">{value}</dd>
          </div>
        ))}
      </dl>
      {f.notes && (
        <p className="px-4 py-3 text-xs text-garage-300 border-t border-garage-700 bg-garage-900/50">
          {f.notes}
        </p>
      )}
    </div>
  );
}

/**
 * Product structured data. This is what turns a server-rendered page into
 * a rich result — price, availability and brand in a form a crawler reads
 * directly rather than inferring from markup.
 */
function ProductJsonLd({ part }: { part: Part }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: part.name,
    description: part.description,
    image: part.image,
    brand: { '@type': 'Brand', name: part.brand },
    category: part.category,
    offers: {
      '@type': 'Offer',
      price: part.price.toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: part.vendor },
      url: part.affiliateUrl,
    },
    ...(part.fitment
      ? {
          additionalProperty: [
            {
              '@type': 'PropertyValue',
              name: 'Bolt pattern',
              value: part.fitment.boltPattern,
            },
            {
              '@type': 'PropertyValue',
              name: 'Offset',
              value: `ET${part.fitment.offsetMm}`,
            },
            {
              '@type': 'PropertyValue',
              name: 'Width',
              value: `${part.fitment.widthInches} in`,
            },
            {
              '@type': 'PropertyValue',
              name: 'Tire size',
              value: part.fitment.tireSize,
            },
          ],
        }
      : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
