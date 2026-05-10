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
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl px-2.5 py-2 transition-all ${
        active
          ? 'bg-garage-700/60 border border-accent shadow-glow'
          : 'border border-transparent hover:border-garage-600 hover:bg-garage-800/40'
      }`}
    >
      <div
        className="w-12 h-9 sm:w-16 sm:h-10 rounded-md overflow-hidden border border-garage-600/60 relative"
        style={{ background: gradientForPreset(preset) }}
      >
        {/* Subtle silhouette so the swatch reads as "stage" */}
        <div className="absolute inset-x-1 bottom-1 h-1 rounded bg-black/40" />
      </div>
      <div className="leading-tight">
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

/**
 * Synthesize a gradient swatch from the preset's thumbnail color and
 * key-light color so each chip feels visually distinct without needing
 * a real screenshot.
 */
function gradientForPreset(preset: EnvironmentPreset): string {
  const keyLight = preset.lights.find((l) => l.type !== 'point')?.color ?? '#ffffff';
  return `linear-gradient(135deg, ${preset.thumbnail} 0%, ${preset.thumbnail} 55%, ${keyLight}33 100%)`;
}
