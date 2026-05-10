import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

export function NavBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'text-garage-100'
        : 'text-garage-300 hover:text-garage-100'
    }`;

  return (
    <header className="h-14 bg-garage-900/95 backdrop-blur border-b border-garage-700 flex items-center px-4 sm:px-5 gap-3 sm:gap-4 sticky top-0 z-40">
      <button
        type="button"
        onClick={() => navigate('/configure')}
        className="flex items-center gap-2.5 group"
      >
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
      </button>

      <nav className="flex items-center gap-0 ml-2 sm:ml-4">
        <NavLink to="/configure" className={linkClass}>
          {({ isActive }) => (
            <>
              Configure
              {isActive && (
                <span className="absolute -bottom-[15px] left-2 right-2 h-0.5 bg-gradient-to-r from-accent to-accent-gold rounded-full" />
              )}
            </>
          )}
        </NavLink>
        <NavLink to="/gallery" className={linkClass}>
          {({ isActive }) => (
            <>
              <span className="hidden sm:inline">Community</span>
              <span className="sm:hidden">Gallery</span>
              {isActive && (
                <span className="absolute -bottom-[15px] left-2 right-2 h-0.5 bg-gradient-to-r from-accent to-accent-gold rounded-full" />
              )}
            </>
          )}
        </NavLink>
        <NavLink to="/catalog" className={linkClass}>
          {({ isActive }) => (
            <>
              Catalog
              {isActive && (
                <span className="absolute -bottom-[15px] left-2 right-2 h-0.5 bg-gradient-to-r from-accent to-accent-gold rounded-full" />
              )}
            </>
          )}
        </NavLink>
        <NavLink to="/admin" className={linkClass}>
          {({ isActive }) => (
            <>
              Admin
              {isActive && (
                <span className="absolute -bottom-[15px] left-2 right-2 h-0.5 bg-gradient-to-r from-accent to-accent-gold rounded-full" />
              )}
            </>
          )}
        </NavLink>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {user && (
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
                navigate('/login');
              }}
              className="text-xs text-garage-300 hover:text-accent-hot border border-garage-600 hover:border-accent px-3 py-1.5 rounded-md transition-colors"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
