'use client';

import { useRenderer } from './RendererContext';

/**
 * Backend switch. Only rendered when the browser actually exposes WebGPU,
 * so the control never offers something that cannot work.
 */
export function RendererToggle() {
  const { backend, setBackend, webgpuAvailable, fallbackReason } = useRenderer();

  if (!webgpuAvailable) return null;

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1">
      <div
        className="flex items-center rounded-full border border-garage-600/70 bg-garage-950/80 p-0.5 backdrop-blur"
        role="group"
        aria-label="Renderer backend"
      >
        {(['webgl', 'webgpu'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setBackend(option)}
            aria-pressed={backend === option}
            className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full transition-colors ${
              backend === option
                ? 'bg-accent text-white'
                : 'text-garage-300 hover:text-garage-100'
            }`}
          >
            {option === 'webgl' ? 'WebGL 2' : 'WebGPU'}
          </button>
        ))}
      </div>
      {fallbackReason && (
        <p className="max-w-[220px] text-right text-[10px] leading-tight text-accent-gold">
          WebGPU unavailable — fell back to WebGL 2.
        </p>
      )}
    </div>
  );
}
