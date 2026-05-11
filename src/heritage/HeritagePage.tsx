import { Link } from 'react-router-dom';
import { Footer } from '@/components/Footer';
import { useInView } from './useInView';

/**
 * E30 Heritage — magazine-style feature page.
 *
 * Premium narrative for tuners and enthusiasts: hero, timeline,
 * motorsport, tuner platform, community, and a final CTA back into the
 * configurator. Each section fades in once on first scroll into view
 * via `useInView`.
 *
 * Image sources: existing verified Pexels CDN URLs (all CORS=*, no
 * attribution required, free commercial use). Re-using the slugs we
 * already trust from `imageLibrary.ts` so they're guaranteed to load.
 */

const px = (id: number, w = 1600, q = 80) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&q=${q}`;

export function HeritagePage() {
  return (
    <div className="bg-garage-950 text-garage-100">
      <Hero />
      <Timeline />
      <Motorsport />
      <TunerPlatform />
      <CommunityCulture />
      <BuildYoursCTA />
      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 1. Hero — full-bleed, headline, CTA
// ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative h-[88vh] min-h-[600px] overflow-hidden">
      <img
        src={px(18311087, 2400)}
        alt="BMW E30 in dramatic shadowed lighting"
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />
      {/* Gradients: top vignette for navbar legibility, bottom vignette
          for the headline + sub copy. */}
      <div className="absolute inset-0 bg-gradient-to-b from-garage-950/70 via-transparent to-garage-950" />
      <div className="absolute inset-0 bg-gradient-to-r from-garage-950/60 via-transparent to-transparent" />

      <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-16 md:pb-24">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-gold mb-5">
          BMW E30 · 1982 – 1994
        </p>
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight max-w-4xl">
          The Legend
          <br />
          That Started It All.
        </h1>
        <p className="text-garage-200 text-base md:text-lg mt-6 max-w-xl leading-relaxed">
          Twelve model years. One M3 with twelve million stories. The chassis
          that taught a generation what a driver's car feels like — and the
          one that's still teaching, four decades later.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/configure"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-accent to-accent-hot hover:shadow-glow text-white font-semibold px-7 py-3.5 rounded-lg transition-all"
          >
            Build Your Dream E30
            <span aria-hidden="true">→</span>
          </Link>
          <a
            href="#timeline"
            className="inline-flex items-center gap-2 text-garage-200 hover:text-garage-100 px-3 py-3.5 text-sm font-semibold uppercase tracking-wider"
          >
            Read the Story
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 2. Timeline — five milestone cards, vertical on mobile / horizontal-scroll on desktop
// ─────────────────────────────────────────────────────────────────────

interface Milestone {
  year: string;
  title: string;
  body: string;
  image: string;
}

const MILESTONES: Milestone[] = [
  {
    year: '1982',
    title: 'Launch',
    body: 'Munich introduces the E30 3 Series, a successor to the iconic E21 with cleaner lines and a more refined chassis.',
    image: px(18781177, 900),
  },
  {
    year: '1986',
    title: 'M3 Arrives',
    body: 'The first M3. Boxed fenders, S14 four-cylinder, and a homologation special built specifically to win touring car championships.',
    image: px(9545550, 900),
  },
  {
    year: '1987',
    title: 'Ravaglia’s WTCC',
    body: 'Roberto Ravaglia wins the World Touring Car Championship in an M3 — cementing the chassis’ motorsport legacy.',
    image: px(26348360, 900),
  },
  {
    year: '1989',
    title: 'DTM Dominance',
    body: 'The M3 takes the DTM crown again. Across the decade it would claim more touring car titles than any car before or since.',
    image: px(17918285, 900),
  },
  {
    year: '1994',
    title: 'End of an Era',
    body: 'The last E30 rolls off the line in South Africa. 2.3 million units built. The blueprint for every M-car that followed.',
    image: px(19413542, 900),
  },
];

function Timeline() {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <section
      id="timeline"
      ref={ref}
      className={`py-20 md:py-28 bg-garage-950 transition-all duration-1000 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <p className="text-xs uppercase tracking-[0.25em] text-accent-gold mb-3">
          1982 – 1994
        </p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">
          Twelve years of becoming a legend.
        </h2>
      </div>

      {/* Horizontal scroll on every breakpoint. Cards snap. */}
      <div className="relative">
        <div className="overflow-x-auto pb-6 snap-x snap-mandatory">
          <div className="flex gap-5 px-6 max-w-7xl mx-auto">
            {MILESTONES.map((m, i) => (
              <MilestoneCard key={m.year} milestone={m} index={i} />
            ))}
            <div className="shrink-0 w-6" />
          </div>
        </div>
      </div>
    </section>
  );
}

function MilestoneCard({ milestone, index }: { milestone: Milestone; index: number }) {
  return (
    <article
      className="snap-start shrink-0 w-[280px] sm:w-[320px] md:w-[360px] bg-garage-800/60 border border-garage-700 hover:border-accent transition-colors rounded-2xl overflow-hidden group"
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={milestone.image}
          alt={`${milestone.year} — ${milestone.title}`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-garage-950 via-garage-950/30 to-transparent" />
        <div className="absolute top-4 left-4 text-xs uppercase tracking-[0.25em] text-accent-gold">
          {milestone.year}
        </div>
        <h3 className="absolute bottom-4 left-5 right-5 text-2xl md:text-3xl font-bold tracking-tight">
          {milestone.title}
        </h3>
      </div>
      <p className="text-sm text-garage-300 leading-relaxed px-5 py-5">
        {milestone.body}
      </p>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 3. Motorsport — split layout with photo + stat grid
// ─────────────────────────────────────────────────────────────────────
function Motorsport() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`relative py-24 md:py-32 transition-all duration-1000 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <img
        src={px(17918285, 2400)}
        alt="Red BMW E30 M3"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-garage-950 via-garage-950/85 to-garage-950/40" />

      <div className="relative max-w-7xl mx-auto px-6">
        <p className="text-xs uppercase tracking-[0.25em] text-accent-gold mb-3">
          Motorsport Glory
        </p>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-2xl">
          Born to win
          <span className="text-accent">.</span>
        </h2>
        <p className="text-garage-200 text-base md:text-lg mt-6 max-w-2xl leading-relaxed">
          Roberto Ravaglia’s 1987 WTCC. DTM titles in '87, '89, '91. Group A
          domination across Europe. The Sport Evolution was built to homologate
          a race car — 1,436 road-going Evos so BMW could go racing. Few cars
          have justified their road-car existence so completely on the track.
        </p>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl">
          <Stat number="1,436" label="Sport Evolution units" />
          <Stat number="2.5L" label="S14 displacement" />
          <Stat number="238 hp" label="Sport Evolution power" />
          <Stat number="6.3 s" label="0–60 mph" />
        </div>
      </div>
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold tracking-tight font-mono">
        {number}
      </div>
      <div className="text-[11px] uppercase tracking-[0.15em] text-garage-400 mt-1.5 leading-snug">
        {label}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 4. Tuner Platform — grid of features
// ─────────────────────────────────────────────────────────────────────
function TunerPlatform() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`bg-garage-900 py-24 md:py-32 transition-all duration-1000 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent-gold mb-3">
              The Tuner's Platform
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              The blank canvas of
              <br />
              German engineering.
            </h2>
            <p className="text-garage-200 text-base md:text-lg mt-6 leading-relaxed">
              The E30 became the modification platform because every part of
              it was conceived right. Inline-six up front. Rear-wheel-drive
              with a 50:50 weight distribution. A chassis that responded to
              suspension geometry the way a track car should. Four decades of
              builders have proved the same thing: this car says yes.
            </p>
          </div>
          <div className="relative aspect-[5/4] rounded-2xl overflow-hidden border border-garage-700">
            <img
              src={px(19272394, 1400)}
              alt="Tuned BMW E30"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-garage-950/50 to-transparent" />
          </div>
        </div>

        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <FeatureCard
            title="M20 / M50 / S50"
            body="From the inline-six factory M20 to swapped S50s and even V8s, the engine bay welcomes anything you put in it."
          />
          <FeatureCard
            title="50 : 50"
            body="Perfect weight distribution. The chassis was designed to be driven, not just sold. It still teaches drivers how to drive."
          />
          <FeatureCard
            title="Aftermarket Deep Bench"
            body="35+ years of continuous parts development. BBS, Bilstein, Ground Control, Supersprint — every name still ships for E30."
          />
          <FeatureCard
            title="Still Alive"
            body="Roughly 150,000 still registered in the US. r/E30 has 50,000+ members. Cars & Coffee meets across three continents. The community didn't move on."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-garage-800/60 border border-garage-700 rounded-2xl p-6 hover:border-accent transition-colors">
      <div className="text-lg font-bold mb-2 tracking-tight">{title}</div>
      <p className="text-sm text-garage-300 leading-relaxed">{body}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 5. Community & Culture — photo grid + caption
// ─────────────────────────────────────────────────────────────────────

const CULTURE_GRID = [
  { id: 16823797, label: 'Drift' },
  { id: 19272394, label: 'Stance' },
  { id: 11110466, label: 'Stealth' },
  { id: 20227074, label: 'Touring' },
  { id: 12472234, label: 'Daily' },
  { id: 18781177, label: 'Resto' },
];

function CommunityCulture() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`bg-garage-950 py-24 md:py-32 transition-all duration-1000 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <p className="text-xs uppercase tracking-[0.25em] text-accent-gold mb-3">
          Community &amp; Culture
        </p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">
          One chassis, six tribes.
        </h2>
        <p className="text-garage-300 text-base md:text-lg mt-5 max-w-2xl leading-relaxed">
          The E30 community isn't a single thing — it's a Venn diagram. The
          purists chase OEM-spec restorations. The drifters destroy diffs.
          The stance crews stretch tyres. They all show up to the same
          meets, and they all argue about the same details.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {CULTURE_GRID.map((item) => (
            <div
              key={item.id}
              className="relative aspect-[4/5] rounded-xl overflow-hidden group cursor-default"
            >
              <img
                src={px(item.id, 900)}
                alt={item.label}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-garage-950 via-garage-950/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-garage-400 mb-1">
                  Subculture
                </p>
                <p className="text-2xl md:text-3xl font-bold tracking-tight">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 6. Build Yours CTA — final pitch
// ─────────────────────────────────────────────────────────────────────
function BuildYoursCTA() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`relative h-[70vh] min-h-[480px] overflow-hidden transition-all duration-1000 ${
        inView ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <img
        src={px(9545550, 2400)}
        alt="White BMW E30 M3"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-garage-950 via-garage-950/40 to-garage-950/60" />

      <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-gold mb-5">
          E30 Forge · Build Studio
        </p>
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight max-w-3xl">
          Now build the one
          <br />
          you've been dreaming of.
        </h2>
        <p className="text-garage-200 text-base md:text-lg mt-6 max-w-xl leading-relaxed">
          Paint, wheels, exhaust, stance. Spec the parts in real-time 3D.
          Save the build, share the link, send the affiliate list to the
          shop.
        </p>
        <Link
          to="/configure"
          className="mt-9 inline-flex items-center gap-2 bg-gradient-to-r from-accent to-accent-hot hover:shadow-glow active:scale-[0.99] text-white font-semibold px-9 py-4 rounded-lg transition-all text-lg"
        >
          Open the Studio
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
