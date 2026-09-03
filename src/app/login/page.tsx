import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginPage } from '@/auth/LoginPage';

export const metadata: Metadata = {
  title: 'Sign in',
  // A login form has nothing to offer a crawler.
  robots: { index: false, follow: false },
};

export default function Page() {
  // LoginPage reads `?from=` with useSearchParams, which Next requires to
  // sit inside a Suspense boundary so the rest of the page can prerender.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-garage-400">
          Loading…
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
