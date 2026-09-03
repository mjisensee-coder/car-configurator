import type { WebGLRendererParameters } from 'three';
import type { Renderer } from '@react-three/fiber';

/**
 * Mirrors React Three Fiber's internal `DefaultGLProps` — the argument it
 * hands a `gl` factory. The package does not re-export that type from its
 * entry point, so it is restated here rather than reached for through a
 * deep import into dist/.
 */
export type GLFactoryProps = Omit<WebGLRendererParameters, 'canvas'> & {
  canvas: HTMLCanvasElement | OffscreenCanvas;
};

/**
 * Renderer backend selection.
 *
 * 'webgl'  — three's classic WebGLRenderer. The default, and what every
 *            browser this app targets supports today.
 * 'webgpu' — three's WebGPURenderer. Note this selects a *pipeline*, not
 *            just an API: WebGPURenderer compiles materials through the
 *            node/TSL system and itself falls back to WebGL 2 when
 *            navigator.gpu is missing. So anything that patches GLSL by
 *            hand — drei's MeshReflectorMaterial, for one — has to be
 *            swapped out whenever this is 'webgpu', regardless of which
 *            GPU API the renderer actually lands on.
 */
export type RendererBackend = 'webgl' | 'webgpu';

export const DEFAULT_BACKEND: RendererBackend = 'webgl';

/**
 * Whether the browser exposes WebGPU at all. Safari and Firefox support
 * is still uneven, which is why WebGPU is opt-in rather than the default:
 * a wrong guess here costs the user the entire scene, and WebGL 2 renders
 * this car — one body, four wheels, a handful of materials — with frames
 * to spare.
 */
export function isWebGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function parseBackend(value: string | null | undefined): RendererBackend | null {
  return value === 'webgpu' || value === 'webgl' ? value : null;
}

/**
 * Builds a WebGPURenderer for R3F's `gl` prop. React Three Fiber 9 accepts
 * a factory returning a promise, which is what lets us await the adapter
 * request before the first frame.
 *
 * If anything in that handshake fails we fall back to WebGLRenderer here
 * rather than letting the Canvas throw — a user who toggles WebGPU on an
 * unsupported machine should see the car, not an error boundary.
 */
export async function createWebGPURenderer(
  props: GLFactoryProps,
  onFallback?: (reason: string) => void,
): Promise<Renderer> {
  try {
    // Dynamic import: three/webgpu is a second copy of the renderer and
    // must stay out of the bundle for the default WebGL path.
    const { WebGPURenderer } = await import('three/webgpu');
    const renderer = new WebGPURenderer({
      canvas: props.canvas as HTMLCanvasElement,
      antialias: true,
      alpha: false,
    });
    await renderer.init();
    return renderer as unknown as Renderer;
  } catch (err) {
    const reason = (err as Error)?.message ?? String(err);
    console.warn('[renderer] WebGPU unavailable, falling back to WebGL 2:', reason);
    onFallback?.(reason);
    const { WebGLRenderer } = await import('three');
    return new WebGLRenderer({
      canvas: props.canvas as HTMLCanvasElement,
      antialias: true,
      preserveDrawingBuffer: true,
    });
  }
}
