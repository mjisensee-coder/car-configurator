import { useNavigate } from 'react-router-dom';
import { getAllBuilds } from '@/services/galleryService';
import { useConfigurator } from '@/configurator/ConfiguratorContext';
import type { CommunityBuild } from '@/types';

export function GalleryPage() {
  const builds = getAllBuilds();
  const { loadConfig } = useConfigurator();
  const navigate = useNavigate();

  const handleLoad = (build: CommunityBuild) => {
    loadConfig(build.config);
    navigate('/configure');
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-garage-grad px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-accent-gold">
            Community
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">
            Featured Builds
          </h1>
          <p className="text-garage-300 mt-2 max-w-2xl">
            Builds from the community. Click any card to load that
            configuration into your studio and make it your own.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {builds.map((b) => (
            <BuildCard key={b.id} build={b} onLoad={() => handleLoad(b)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BuildCard({ build, onLoad }: { build: CommunityBuild; onLoad: () => void }) {
  return (
    <button
      onClick={onLoad}
      className="text-left group bg-garage-800/60 border border-garage-700 hover:border-accent rounded-2xl overflow-hidden transition-all hover:shadow-glow"
    >
      <div className="aspect-[16/10] overflow-hidden bg-garage-900">
        <img
          src={build.screenshot}
          alt={build.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold truncate">{build.name}</h3>
            <p className="text-xs text-garage-400 mt-0.5">{build.creator}</p>
          </div>
          <span className="text-sm font-bold text-accent-gold whitespace-nowrap">
            ${build.totalCost.toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-garage-300 mt-2 line-clamp-2">
          {build.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {build.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-wider text-garage-300 bg-garage-700/60 px-2 py-0.5 rounded-full"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
