import { useState } from 'react';
import html2canvas from 'html2canvas';
import { useConfigurator } from './ConfiguratorContext';
import { resolveConfig, buildShareUrl } from '@/services/buildService';
import type { Part } from '@/types';

export function SummaryPanel() {
  const { config } = useConfigurator();
  const summary = resolveConfig(config);
  const [open, setOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1024,
  );
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const items: { label: string; part: Part | undefined }[] = [
    { label: 'Paint', part: summary.paint },
    { label: 'Wheels', part: summary.wheels },
    { label: 'Exhaust', part: summary.exhaust },
    { label: 'Suspension', part: summary.suspension },
    { label: 'Decals', part: summary.sticker?.price ? summary.sticker : undefined },
  ];

  const handleShare = async () => {
    const url = buildShareUrl(config);
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('Link copied');
    } catch {
      setShareStatus(url);
    }
    setTimeout(() => setShareStatus(null), 2200);
  };

  const handleScreenshot = async () => {
    const canvasEl = document.querySelector<HTMLCanvasElement>(
      '#configurator-canvas canvas',
    );
    if (!canvasEl) return;
    try {
      const target = canvasEl.parentElement ?? canvasEl;
      const snap = await html2canvas(target, {
        backgroundColor: '#0a0a0c',
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `e30-build-${Date.now()}.png`;
      link.href = snap.toDataURL('image/png');
      link.click();
      setShareStatus('Screenshot saved');
    } catch {
      setShareStatus('Screenshot failed');
    }
    setTimeout(() => setShareStatus(null), 2200);
  };

  const handleBuyAll = () => {
    items.forEach(({ part }) => {
      if (part?.affiliateUrl) {
        window.open(part.affiliateUrl, '_blank', 'noopener');
      }
    });
  };

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 lg:right-auto z-30 lg:w-[360px] max-w-[calc(100vw-7rem)] lg:max-w-[calc(100vw-2rem)] bg-garage-900/95 backdrop-blur-xl border border-garage-700 rounded-2xl shadow-panel overflow-hidden transition-all`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-garage-800/50 transition-colors"
      >
        <div className="text-left">
          <div className="text-xs uppercase tracking-widest text-garage-400">
            Your Build
          </div>
          <div className="text-2xl font-bold mt-0.5">
            ${summary.total.toLocaleString()}
          </div>
        </div>
        <div className="text-garage-300 text-sm">
          {open ? '▾' : '▸'}
        </div>
      </button>

      {open && (
        <div className="border-t border-garage-700 px-5 pt-4 pb-5 space-y-3">
          {items.map(({ label, part }) =>
            part ? (
              <div key={label} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-garage-400">
                    {label}
                  </div>
                  <div className="truncate text-garage-100">{part.name}</div>
                </div>
                <div className="text-garage-200 font-mono text-xs whitespace-nowrap">
                  ${part.price.toLocaleString()}
                </div>
              </div>
            ) : null,
          )}

          <div className="pt-3 mt-2 border-t border-garage-700 flex justify-between items-baseline">
            <span className="text-sm text-garage-300">Total</span>
            <span className="text-xl font-bold">
              ${summary.total.toLocaleString()}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleShare}
              className="flex-1 bg-garage-700 hover:bg-garage-600 text-garage-100 text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Share
            </button>
            <button
              onClick={handleScreenshot}
              className="flex-1 bg-garage-700 hover:bg-garage-600 text-garage-100 text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Screenshot
            </button>
          </div>
          <button
            onClick={handleBuyAll}
            className="w-full bg-gradient-to-r from-accent to-accent-hot hover:shadow-glow text-white font-semibold py-2.5 rounded-lg transition-all"
          >
            Buy All Parts
          </button>

          {shareStatus && (
            <div className="text-xs text-center text-accent-gold pt-1">
              {shareStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
