import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scene } from './Scene';
import { Sidebar } from './Sidebar';
import { SummaryPanel } from './SummaryPanel';
import { useConfigurator } from './ConfiguratorContext';
import { decodeConfig } from '@/services/buildService';

export function ConfiguratorPage() {
  const [params, setParams] = useSearchParams();
  const { loadConfig } = useConfigurator();

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
      </div>
      <Sidebar />
    </div>
  );
}

function SceneOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute top-4 left-4 text-xs uppercase tracking-widest text-garage-400">
        E30 · Build Studio
      </div>
      <div className="absolute bottom-4 right-4 text-xs text-garage-500 font-mono">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
