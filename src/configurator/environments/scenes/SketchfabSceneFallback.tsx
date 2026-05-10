import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Wraps a GLB-backed environment scene with two safety nets:
 *
 *   1. A HEAD probe before mounting useGLTF — Sketchfab GLBs land in
 *      /public/environments/ via a manual user download (their API
 *      requires auth). If the file isn't there, useGLTF would suspend
 *      forever; we render a graceful fallback instead.
 *
 *   2. An in-3D <Html> message telling the operator exactly which file
 *      to drop where, plus a link to the original Sketchfab page so the
 *      attribution path stays clear.
 *
 * Once the GLB is in place the next page load picks it up automatically.
 */

interface SketchfabSceneFallbackProps {
  /** Public URL of the GLB. Probed via fetch HEAD before useGLTF runs. */
  url: string;
  /** Renderer that uses useGLTF + scene transforms. */
  children: (loadedUrl: string) => ReactNode;
  /** Display name of the model for the missing-asset card. */
  modelName: string;
  /** Author display name + Sketchfab profile URL for attribution. */
  authorName: string;
  authorUrl: string;
  /** Sketchfab page URL for the model itself. */
  sourceUrl: string;
  /** A minimal procedural fallback (floor + walls) so the car isn't in a void. */
  procedural: ReactNode;
}

export function SketchfabSceneFallback({
  url,
  children,
  modelName,
  authorName,
  authorUrl,
  sourceUrl,
  procedural,
}: SketchfabSceneFallbackProps) {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        if (cancelled) return;
        // Vite dev server returns 200 + index.html for missing files — the
        // SPA fallback. Detect that by checking content-type.
        const ct = r.headers.get('content-type') ?? '';
        const isHtmlFallback = ct.startsWith('text/html');
        setExists(r.ok && !isHtmlFallback);
      })
      .catch(() => {
        if (!cancelled) setExists(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (exists === null) {
    return <>{procedural}</>;
  }

  if (!exists) {
    return (
      <>
        {procedural}
        <Html center position={[0, 1.6, 0]} distanceFactor={5}>
          <div className="bg-garage-900/95 backdrop-blur-md border border-accent/40 rounded-2xl p-5 max-w-sm shadow-glow text-garage-100 pointer-events-auto">
            <p className="text-[10px] uppercase tracking-widest text-accent-gold mb-2">
              Asset Missing
            </p>
            <p className="text-sm font-bold mb-2">{modelName}</p>
            <p className="text-xs text-garage-300 leading-relaxed mb-3">
              Sketchfab requires authentication to download — manually save{' '}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-hot hover:underline"
              >
                the GLB
              </a>{' '}
              to:
            </p>
            <code className="block text-[11px] font-mono bg-garage-950 border border-garage-700 rounded px-2 py-1.5 text-accent-gold break-all mb-3">
              {url.replace(/^\//, 'public/')}
            </code>
            <p className="text-[11px] text-garage-400 leading-relaxed">
              Model by{' '}
              <a
                href={authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-garage-200 hover:text-accent underline-offset-2 hover:underline"
              >
                {authorName}
              </a>{' '}
              · CC BY 4.0
            </p>
          </div>
        </Html>
      </>
    );
  }

  return <SketchfabSceneInner url={url}>{children}</SketchfabSceneInner>;
}

/** Inner component — only mounted when we know the URL resolves. */
function SketchfabSceneInner({
  url,
  children,
}: {
  url: string;
  children: (loadedUrl: string) => ReactNode;
}) {
  // Prefetch via useGLTF; the children renderer will call useGLTF(url)
  // again, but drei caches the result, so it's a no-op fetch.
  useGLTF(url);
  return <>{children(url)}</>;
}

/**
 * Convenience: clone a GLTF scene tree once per mount so material
 * mutations or parent mounts don't bleed across the global drei cache.
 */
export function useClonedSceneFromUrl(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => cloneSkeleton(scene), [scene]);
}
