'use client';

import dynamic from 'next/dynamic';

/**
 * Client boundary for the configurator.
 *
 * The 3D studio is loaded with `ssr: false` on purpose. It is WebGL from
 * the first frame — there is no meaningful HTML for a server to produce,
 * and three.js touches `window` during module evaluation. Server rendering
 * it would cost a render pass and buy nothing, which is exactly why the
 * move to Next was scoped to the catalog and gallery pages.
 */
const ConfiguratorPage = dynamic(
  () => import('./ConfiguratorPage').then((m) => m.ConfiguratorPage),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="flex items-center gap-2 text-garage-300 text-sm">
          <svg
            className="animate-spin"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
          </svg>
          Loading studio…
        </div>
      </div>
    ),
  },
);

export function ConfiguratorClient() {
  return <ConfiguratorPage />;
}
