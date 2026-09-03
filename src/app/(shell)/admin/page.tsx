import type { Metadata } from 'next';
import { RequireAuth } from '@/auth/RequireAuth';
import { getAllParts } from '@/server/queries';
import { CatalogHydrator } from '@/services/CatalogHydrator';
import { AdminClient } from '@/admin/AdminClient';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const parts = await getAllParts();
  return (
    <CatalogHydrator parts={parts}>
      <RequireAuth>
        <AdminClient />
      </RequireAuth>
    </CatalogHydrator>
  );
}
