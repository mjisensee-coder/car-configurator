import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scene } from './Scene';
import { Sidebar } from './Sidebar';
import { SummaryPanel } from './SummaryPanel';
import { useConfigurator } from './ConfiguratorContext';
import { decodeConfig } from '@/services/buildService';

export function ConfiguratorPage() {
  const [params, setParams] = useSearchParams();
  const { loadConfig } = useConfigurator();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const encoded = params.get('build');
    if (encoded) {
      const decoded = decodeConfig(encoded);
      if (decoded) {
        loadConfig(decoded);
      }
      params.delete('build');
      setParams(params, { replace: true });
    }
  }, [params, loadConfig, setParams]);

  return (
    <div className="flex h-[calc(100vh-56px)] bg-garage-grad relative overflow-hidden">
      <div id="configurator-canvas" className="flex-1 relative">
        <Scene />
        <SceneOverlay />
        <SummaryPanel />

        {/* Mobile: floating "Configure" button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-30 bg-gradient-to-r from-accent to-accent-hot text-white font-semibold px-5 py-3 rounded-full shadow-glow active:scale-95 transition-transform flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18M6 12h12M9 18h6" />
          </svg>
          Configure
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          aria-label="Close configurator"
          onClick={() => setDrawerOpen(false)}
          className="absolute inset-0 bg-garage-950/70 backdrop-blur-sm"
        />
        <div
          className={`absolute bottom-0 left-0 right-0 max-h-[85vh] bg-garage-900 border-t border-garage-700 rounded-t-3xl shadow-panel transition-transform duration-300 ${
            drawerOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-garage-600 mx-auto" />
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-4 top-3 text-garage-400 hover:text-garage-100 text-xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="h-[80vh]">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute top-4 left-4 text-[11px] uppercase tracking-[0.2em] text-garage-400">
        E30 · Build Studio
      </div>
      <div className="hidden md:block absolute bottom-4 right-4 text-xs text-garage-500 font-mono">
        Drag to rotate · Scroll to zoom
      </div>
      {/* CC BY 4.0 attribution — required by the model license */}
      <div className="hidden md:block absolute top-4 right-4 text-[10px] text-garage-500 pointer-events-auto">
        Model:{' '}
        <a
          href="https://sketchfab.com/3d-models/bmw-m3-e30-6d67d12a2abe4e119842f65e46fa2f67"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-garage-300 underline-offset-2 hover:underline transition-colors"
        >
          BMW M3 E30
        </a>{' '}
        ·{' '}
        <a
          href="https://sketchfab.com/temp0.crazy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-garage-300 underline-offset-2 hover:underline transition-colors"
        >
          Artem P
        </a>{' '}
        ·{' '}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-garage-300 underline-offset-2 hover:underline transition-colors"
        >
          CC BY 4.0
        </a>
      </div>
    </div>
  );
}
