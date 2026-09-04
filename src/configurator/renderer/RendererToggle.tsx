'use client';

import { useRenderer } from './RendererContext';

/**
 * Backend switch — developer-facing, shown only when the URL carries an
 * explicit `?renderer=`.
 *
 * It is not offered to users because the WebGPU path does not currently
 * render this scene. three's WebGPURenderer initialises fine and reports a
 * true WebGPU backend, but drei 10's components still assume a
 * WebGLRenderer: useKTX2 calls `detectSupport(gl)` and reads WebGL
 * extensions off it, and the same assumption shows up elsewhere in the
 * scene, so the first frame throws "Cannot read properties of undefined
 * (reading 'has')" and takes the canvas down. Once that happens the
 * cached loaders stay broken for the rest of the page session, so a user
 * who flipped the switch could not flip it back.
 *
 * Keep the plumbing — it is a handful of lines and the day drei's
 * components are backend-agnostic this becomes a one-line change. Until
 * then WebGL 2 renders this car with frames to spare.
 */
export function RendererToggle() {
  const { backend, setBackend, webgpuAvailable, explicitOverride, fallbackReason } =
    useRenderer();

  if (!webgpuAvailable || !explicitOverride) return null;

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
