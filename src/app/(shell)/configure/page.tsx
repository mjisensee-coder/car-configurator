import type { Metadata } from 'next';
import { getAllParts } from '@/server/queries';
import { CatalogHydrator } from '@/services/CatalogHydrator';
import { RequireAuth } from '@/auth/RequireAuth';
import { ConfiguratorClient } from '@/configurator/ConfiguratorClient';

export const metadata: Metadata = {
  title: 'Build studio',
  description:
    'Configure a BMW E30 in 3D — paint, wheels, exhaust, ride height and decals.',
  // Sign-in gated, so there is nothing here for a crawler to reach.
  robots: { index: false, follow: false },
};

/**
 * The catalog is fetched on the server and handed to the client store, so
 * the studio opens with parts already in memory — no client fetch waterfall
 * before the first paint of the sidebar and price panel.
 */
export default async function ConfigurePage() {
  const parts = await getAllParts();

  return (
    <CatalogHydrator parts={parts}>
      <RequireAuth>
        <ConfiguratorClient />
      </RequireAuth>
    </CatalogHydrator>
  );
}
