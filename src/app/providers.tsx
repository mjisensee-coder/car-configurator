'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/auth/AuthContext';
import { ConfiguratorProvider } from '@/configurator/ConfiguratorContext';

/**
 * Client context boundary.
 *
 * Both contexts hold interactive state, so they cannot live in a server
 * component. Keeping them in one file means the rest of the tree stays
 * server-rendered by default — only components that actually need
 * interactivity opt into 'use client'.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ConfiguratorProvider>{children}</ConfiguratorProvider>
    </AuthProvider>
  );
}
