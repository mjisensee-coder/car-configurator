'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_BACKEND,
  isWebGPUAvailable,
  parseBackend,
  type RendererBackend,
} from './backend';

interface RendererContextValue {
  backend: RendererBackend;
  setBackend: (backend: RendererBackend) => void;
  /** Whether the browser exposes navigator.gpu at all. */
  webgpuAvailable: boolean;
  /**
   * True only when the URL carried an explicit `?renderer=`. The backend
   * switch is hidden otherwise — see RendererToggle for why.
   */
  explicitOverride: boolean;
  /** Set when a WebGPU init failed and we silently dropped to WebGL. */
  fallbackReason: string | null;
  reportFallback: (reason: string) => void;
}

const RendererContext = createContext<RendererContextValue | undefined>(
  undefined,
);

/**
 * Holds the active renderer backend.
 *
 * Deliberately separate from ConfiguratorContext: the backend is a
 * property of the machine looking at the car, not of the build. Putting it
 * in CarConfig would bake it into share links and gallery builds, so a
 * link made on a WebGPU laptop would try to force WebGPU on whoever opened
 * it.
 *
 * `?renderer=webgpu` overrides the default, which is how you exercise the
 * path without shipping it to everyone.
 */
export function RendererProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<RendererBackend>(DEFAULT_BACKEND);
  const [webgpuAvailable, setWebgpuAvailable] = useState(false);
  const [explicitOverride, setExplicitOverride] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // navigator.gpu is browser-only; check after mount so the server render
  // and the first client render agree.
  useEffect(() => {
    setWebgpuAvailable(isWebGPUAvailable());
    const override = parseBackend(
      new URLSearchParams(window.location.search).get('renderer'),
    );
    if (override) {
      setBackend(override);
      setExplicitOverride(true);
    }
  }, []);

  const value = useMemo<RendererContextValue>(
    () => ({
      backend,
      setBackend: (next) => {
        setFallbackReason(null);
        setBackend(next);
      },
      webgpuAvailable,
      explicitOverride,
      fallbackReason,
      reportFallback: setFallbackReason,
    }),
    [backend, webgpuAvailable, explicitOverride, fallbackReason],
  );

  return (
    <RendererContext.Provider value={value}>
      {children}
    </RendererContext.Provider>
  );
}

export function useRenderer(): RendererContextValue {
  const ctx = useContext(RendererContext);
  if (!ctx) throw new Error('useRenderer must be used inside <RendererProvider>');
  return ctx;
}
