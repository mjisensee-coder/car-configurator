import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllBuilds } from '@/services/galleryService';
import { useConfigurator } from '@/configurator/ConfiguratorContext';
import type { CommunityBuild } from '@/types';
import { E30 } from '@/data/imageLibrary';

export function GalleryPage() {
  const allBuilds = getAllBuilds();
  const { loadConfig } = useConfigurator();
  const navigate = useNavigate();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    allBuilds.forEach((b) => b.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [allBuilds]);

  const builds = activeTag
    ? allBuilds.filter((b) => b.tags.includes(activeTag))
    : allBuilds;

  const handleLoad = (build: CommunityBuild) => {
    loadConfig(build.config);
    navigate('/configure');
  };

  const totalSpend = allBuilds.reduce((sum, b) => sum + b.totalCost, 0);
  const avgSpend = Math.round(totalSpend / allBuilds.length);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-garage-950">
      {/* Hero */}
      <section className="relative h-[36vh] min-h-[280px] overflow-hidden border-b border-garage-700">
        <img
          src={E30.heroWide}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-garage-950 via-garage-950/60 to-garage-950/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent,#0a0a0c_85%)]" />

        <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-gold">
            Community
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 tracking-tight">
            Featured builds.
          </h1>
          <p className="text-garage-200 mt-3 max-w-xl text-base md:text-lg leading-relaxed">
            Hand-picked configurations from the community. Click any to load
            it into your studio.
          </p>

          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-xs uppercase tracking-wider text-garage-300">
            <span>
              <span className="text-garage-100 font-bold text-base font-mono">
                {allBuilds.length}
              </span>{' '}
              builds
            </span>
            <span>
              <span className="text-garage-100 font-bold text-base font-mono">
                {allTags.length}
              </span>{' '}
              styles
            </span>
            <span>
              <span className="text-garage-100 font-bold text-base font-mono">
                ${avgSpend.toLocaleString()}
              </span>{' '}
              avg build cost
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Tag filters */}
        <div className="flex flex-wrap gap-1.5 mb-8">
          <TagChip
            label="All"
            active={activeTag === null}
            onClick={() => setActiveTag(null)}
            count={allBuilds.length}
          />
          {allTags.map((tag) => {
            const count = allBuilds.filter((b) => b.tags.includes(tag)).length;
            return (
              <TagChip
                key={tag}
                label={tag}
                active={activeTag === tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                count={count}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {builds.map((b) => (
            <BuildCard key={b.id} build={b} onLoad={() => handleLoad(b)} />
          ))}
        </div>

        {builds.length === 0 && (
          <div className="text-center text-garage-400 py-20">
            No builds match this filter.
          </div>
        )}
      </div>
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
        active
          ? 'bg-accent text-white shadow-glow'
          : 'bg-garage-800 text-garage-200 border border-garage-700 hover:border-accent hover:text-garage-100'
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-[10px] font-mono ${
          active ? 'text-white/80' : 'text-garage-400 group-hover:text-garage-300'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function BuildCard({ build, onLoad }: { build: CommunityBuild; onLoad: () => void }) {
  return (
    <button
      onClick={onLoad}
      className="text-left group bg-garage-800/60 border border-garage-700 hover:border-accent rounded-2xl overflow-hidden transition-all hover:shadow-glow hover:-translate-y-0.5 duration-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-garage-900">
        <img
          src={build.screenshot}
          alt={build.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-garage-950 via-transparent to-transparent" />
        <div className="absolute top-3 right-3 bg-garage-950/85 backdrop-blur border border-garage-600/60 px-2.5 py-1 rounded-full text-xs font-bold text-accent-gold tracking-wide">
          ${build.totalCost.toLocaleString()}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h3 className="font-bold text-lg leading-tight truncate">{build.name}</h3>
        </div>
        <p className="text-xs text-garage-400 mb-2.5">{build.creator}</p>
        <p className="text-sm text-garage-300 line-clamp-2 leading-relaxed">
          {build.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {build.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-wider text-garage-300 bg-garage-700/60 border border-garage-600/40 px-2 py-0.5 rounded-full"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-garage-700 flex items-center justify-between text-sm">
          <span className="text-garage-400 text-xs uppercase tracking-wider">
            Open in studio
          </span>
          <span className="text-accent group-hover:text-accent-hot font-semibold transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </div>
      </div>
    </button>
  );
}
