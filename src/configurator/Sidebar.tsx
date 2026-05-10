import { useState } from 'react';
import type { PartCategory, StickerId } from '@/types';
import { useConfigurator } from './ConfiguratorContext';
import { getPartsByCategory, getPartById } from '@/services/partsService';
import { getDefaultSuspensionForRideHeight } from '@/services/buildService';
import { BuyPartCard } from './BuyPartCard';
import { PhotoMatcher } from './parts/PhotoMatcher';

const TABS: { id: PartCategory; label: string }[] = [
  { id: 'paint', label: 'Paint' },
  { id: 'wheels', label: 'Wheels' },
  { id: 'exhaust', label: 'Exhaust' },
  { id: 'suspension', label: 'Suspension' },
  { id: 'stickers', label: 'Stickers' },
];

export function Sidebar() {
  const [active, setActive] = useState<PartCategory>('paint');

  return (
    <aside className="w-full lg:w-[400px] bg-garage-900/80 backdrop-blur-xl border-l border-garage-700 flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-6 pb-3 border-b border-garage-700">
        <p className="text-xs uppercase tracking-widest text-garage-400">
          Configure
        </p>
        <h2 className="text-xl font-bold mt-0.5">Build Studio</h2>
      </div>

      <nav className="flex border-b border-garage-700 px-3 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
              active === t.id
                ? 'text-garage-100'
                : 'text-garage-400 hover:text-garage-200'
            }`}
          >
            {t.label}
            {active === t.id && (
              <span className="absolute left-2 right-2 bottom-0 h-0.5 bg-gradient-to-r from-accent to-accent-gold rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {active === 'paint' && <PaintPanel />}
        {active === 'wheels' && <WheelsPanel />}
        {active === 'exhaust' && <ExhaustPanel />}
        {active === 'suspension' && <SuspensionPanel />}
        {active === 'stickers' && <StickersPanel />}
      </div>
    </aside>
  );
}

// ===== Panels =====

function PaintPanel() {
  const { config, setPaint } = useConfigurator();
  const paints = getPartsByCategory('paint');
  const selected = getPartById(config.paintId);

  return (
    <div>
      <div className="grid grid-cols-5 gap-2.5 mb-5">
        {paints.map((p) => {
          const hex = (p.renderHint?.hex as string) ?? '#888';
          const isActive = p.id === config.paintId;
          return (
            <button
              key={p.id}
              onClick={() => setPaint(p.id)}
              className={`group relative aspect-square rounded-xl border-2 transition-all ${
                isActive
                  ? 'border-accent shadow-glow scale-105'
                  : 'border-garage-600 hover:border-garage-400'
              }`}
              title={p.name}
              style={{ backgroundColor: hex }}
            >
              {isActive && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent border-2 border-garage-900" />
              )}
            </button>
          );
        })}
      </div>
      <div className="text-sm text-garage-300 mb-1">{selected?.name}</div>
      <div className="text-xs text-garage-400 mb-4">{selected?.brand}</div>
      {selected && <BuyPartCard part={selected} />}
    </div>
  );
}

function WheelsPanel() {
  const { config, setWheels } = useConfigurator();
  const wheels = getPartsByCategory('wheels');
  const selected = getPartById(config.wheelId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5">
        {wheels.map((w) => {
          const isActive = w.id === config.wheelId;
          return (
            <button
              key={w.id}
              onClick={() => setWheels(w.id)}
              className={`text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                isActive
                  ? 'border-accent bg-accent/5'
                  : 'border-garage-600 hover:border-garage-400 bg-garage-800/40'
              }`}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-garage-600 flex-shrink-0 bg-garage-700">
                <img
                  src={w.image}
                  alt={w.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{w.name}</div>
                <div className="text-xs text-garage-400">
                  {w.brand} · ${w.price.toLocaleString()}
                </div>
              </div>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      <PhotoMatcher category="wheels" onSelect={setWheels} />
      {selected && <BuyPartCard part={selected} />}
    </div>
  );
}

function ExhaustPanel() {
  const { config, setExhaust } = useConfigurator();
  const exhausts = getPartsByCategory('exhaust');
  const selected = getPartById(config.exhaustId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5">
        {exhausts.map((e) => {
          const isActive = e.id === config.exhaustId;
          return (
            <button
              key={e.id}
              onClick={() => setExhaust(e.id)}
              className={`text-left p-3 rounded-xl border transition-all ${
                isActive
                  ? 'border-accent bg-accent/5'
                  : 'border-garage-600 hover:border-garage-400 bg-garage-800/40'
              }`}
            >
              <div className="font-semibold text-sm">{e.name}</div>
              <div className="text-xs text-garage-400">
                {e.brand} · ${e.price.toLocaleString()}
              </div>
              <div className="text-xs text-garage-300 mt-1.5 line-clamp-2">
                {e.description}
              </div>
            </button>
          );
        })}
      </div>
      <PhotoMatcher category="exhaust" onSelect={setExhaust} />
      {selected && <BuyPartCard part={selected} />}
    </div>
  );
}

function SuspensionPanel() {
  const { config, setRideHeight } = useConfigurator();
  const suspensionPart = getDefaultSuspensionForRideHeight(config.rideHeight);
  const dropMm = Math.round(Math.abs(config.rideHeight) * 1000);
  const direction = config.rideHeight < 0 ? 'lowered' : config.rideHeight > 0 ? 'raised' : 'stock';

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-semibold">Ride Height</label>
          <span className="text-xs text-garage-400 font-mono">
            {config.rideHeight === 0 ? 'OEM' : `${config.rideHeight < 0 ? '-' : '+'}${dropMm} mm`}
          </span>
        </div>
        <input
          type="range"
          min={-0.3}
          max={0.05}
          step={0.01}
          value={config.rideHeight}
          onChange={(e) => setRideHeight(parseFloat(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-garage-500 mt-1">
          <span>Slammed</span>
          <span>OEM</span>
        </div>
      </div>

      <div className="bg-garage-800/60 border border-garage-700 rounded-xl p-3.5">
        <div className="text-xs uppercase tracking-wider text-garage-400 mb-2">
          Recommended Hardware
        </div>
        <div className="text-sm font-semibold">{suspensionPart?.name}</div>
        <div className="text-xs text-garage-400 mt-0.5 capitalize">
          {direction} · {suspensionPart?.brand}
        </div>
      </div>

      {suspensionPart && <BuyPartCard part={suspensionPart} />}
    </div>
  );
}

function StickersPanel() {
  const { config, setSticker } = useConfigurator();
  const stickers = getPartsByCategory('stickers').filter(
    (s) => s.id.startsWith('stickers-'),
  );
  const selected = getPartById(`stickers-${config.stickerId}`);

  const stickerIdFromPart = (id: string): StickerId =>
    id.replace('stickers-', '') as StickerId;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        {stickers.map((s) => {
          const id = stickerIdFromPart(s.id);
          const isActive = id === config.stickerId;
          return (
            <button
              key={s.id}
              onClick={() => setSticker(id)}
              className={`text-left p-3 rounded-xl border transition-all ${
                isActive
                  ? 'border-accent bg-accent/5'
                  : 'border-garage-600 hover:border-garage-400 bg-garage-800/40'
              }`}
            >
              <div className="font-semibold text-sm leading-tight">{s.name}</div>
              <div className="text-xs text-garage-400 mt-1">
                {s.price === 0 ? 'Free' : `$${s.price}`}
              </div>
            </button>
          );
        })}
      </div>
      {selected && selected.price > 0 && <BuyPartCard part={selected} />}
    </div>
  );
}
