'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

/**
 * Client-side auth gate, replacing the router-level <ProtectedRoute>.
 *
 * The session is in-memory by design (per spec), so the server has no way
 * to know whether a visitor is signed in — the gate has to run in the
 * browser. That is also why only /configure and /admin use it: the public
 * pages must stay server-rendered to be indexable, and gating them would
 * defeat the reason for server rendering them at all.
 *
 * The current path rides along in `?from=`, so login can bounce back.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center text-sm text-garage-400">
        Redirecting to sign in…
      </div>
    );
  }
  return <>{children}</>;
}
