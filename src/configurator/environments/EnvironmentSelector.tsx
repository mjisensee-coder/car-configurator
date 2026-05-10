import { useConfigurator } from '../ConfiguratorContext';
import { ENVIRONMENT_LIST, type EnvironmentPreset } from './environmentPresets';

/**
 * Bottom-of-canvas carousel for switching showroom environments.
 *
 * Reads + writes the configurator's environmentId state, so the choice
 * persists in share links and gallery builds (it's part of CarConfig).
 */
export function EnvironmentSelector() {
  const { config, setEnvironment } = useConfigurator();

  return (
    <div className="hidden md:block absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="flex gap-2 bg-garage-900/85 backdrop-blur-md border border-garage-700 rounded-2xl p-2 shadow-panel">
        {ENVIRONMENT_LIST.map((preset) => (
          <EnvironmentChip
            key={preset.id}
            preset={preset}
            active={config.environmentId === preset.id}
            onClick={() => setEnvironment(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}

function EnvironmentChip({
  preset,
  active,
  onClick,
}: {
  preset: EnvironmentPreset;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={preset.vibe}
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 transition-all ${
        active
          ? 'bg-garage-700/60 border border-accent shadow-glow'
          : 'border border-transparent hover:border-garage-600 hover:bg-garage-800/40'
      }`}
    >
      <div className="w-20 h-12 sm:w-24 sm:h-14 rounded-md overflow-hidden border border-garage-600/60 relative bg-garage-800">
        <img
          src={preset.thumbnailUrl}
          alt={preset.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-all ${
            active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
          }`}
          draggable={false}
        />
        {/* Subtle bottom gradient so the label below reads cleanly */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
      <div className="leading-tight text-center">
        <div
          className={`text-[11px] font-semibold ${
            active ? 'text-garage-100' : 'text-garage-300 group-hover:text-garage-100'
          }`}
        >
          {preset.name}
        </div>
      </div>
      {active && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
      )}
    </button>
  );
}
