'use client';

import dynamic from 'next/dynamic';

/**
 * The admin page renders a three.js wheel preview, so it is client-only for
 * the same reason the configurator is.
 */
const AdminPage = dynamic(() => import('./AdminPage').then((m) => m.AdminPage), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-56px)] flex items-center justify-center text-sm text-garage-400">
      Loading admin…
    </div>
  ),
});

export function AdminClient() {
  return <AdminPage />;
}
