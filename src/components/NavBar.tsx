'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/auth/AuthContext';

/**
 * Top navigation. Client component — it reads auth state and the active
 * path to draw the underline.
 *
 * Catalog, Community and Heritage are public (server-rendered, indexable).
 * Configure and Admin are gated by <RequireAuth>; following them while
 * signed out lands on /login and bounces back after sign-in.
 */

const LINKS = [
  { href: '/configure', label: 'Configure' },
  { href: '/gallery', label: 'Community', shortLabel: 'Gallery' },
  { href: '/heritage', label: 'Heritage' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/admin', label: 'Admin' },
] as const;

export function NavBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="h-14 bg-garage-900/95 backdrop-blur border-b border-garage-700 flex items-center px-4 sm:px-5 gap-3 sm:gap-4 sticky top-0 z-40">
      <Link href="/configure" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-gold flex items-center justify-center group-hover:shadow-glow transition-shadow">
          <svg width="16" height="16" viewBox="0 0 64 64" fill="white">
            <path d="M10 38c0-2 2-4 4-4l6-1 4-7c1-2 3-3 5-3h18c2 0 4 1 5 3l4 7 4 1c2 0 4 2 4 4v6c0 1-1 2-2 2h-6a4 4 0 1 1-8 0H22a4 4 0 1 1-8 0H8c-1 0-2-1-2-2v-6z" />
          </svg>
        </div>
        <div className="leading-none text-left">
          <div className="font-bold text-sm">E30 Forge</div>
          <div className="text-[10px] text-garage-400 uppercase tracking-[0.15em]">
            Build Studio
          </div>
        </div>
      </Link>

      <nav className="flex items-center gap-0 ml-2 sm:ml-4">
        {LINKS.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'text-garage-100'
                  : 'text-garage-300 hover:text-garage-100'
              }`}
            >
              {'shortLabel' in link ? (
                <>
                  <span className="hidden sm:inline">{link.label}</span>
                  <span className="sm:hidden">{link.shortLabel}</span>
                </>
              ) : (
                link.label
              )}
              {isActive && (
                <span className="absolute -bottom-[15px] left-2 right-2 h-0.5 bg-gradient-to-r from-accent to-accent-gold rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <>
            <span className="text-xs text-garage-400 hidden md:inline">
              Signed in as{' '}
              <span className="text-garage-200 font-semibold">
                {user.username}
              </span>
            </span>
            <button
              onClick={() => {
                signOut();
                router.push('/login');
              }}
              className="text-xs text-garage-300 hover:text-accent-hot border border-garage-600 hover:border-accent px-3 py-1.5 rounded-md transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-xs text-garage-300 hover:text-accent-hot border border-garage-600 hover:border-accent px-3 py-1.5 rounded-md transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
