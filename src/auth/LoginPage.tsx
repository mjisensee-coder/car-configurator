import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { E30 } from '@/data/imageLibrary';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/configure';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const ok = await signIn(username, password);
    setSubmitting(false);
    if (ok) {
      navigate(redirectTo, { replace: true });
    } else {
      setError('Invalid credentials. Try again.');
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.3fr_1fr] bg-garage-950">
      {/* Left: cinematic E30 hero */}
      <div className="relative hidden lg:block overflow-hidden">
        <img
          src={E30.heroWide}
          alt="BMW E30"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-garage-950 via-garage-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-garage-950 via-transparent to-transparent" />

        <div className="relative h-full flex flex-col justify-end p-12 z-10">
          <div className="max-w-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-accent-gold mb-4">
              E30 Forge · Build Studio
            </p>
            <h1 className="text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
              Build the E30
              <br />
              <span className="text-accent">you've always wanted.</span>
            </h1>
            <p className="text-garage-200 text-lg mt-5 max-w-md leading-relaxed">
              A premium 3D configurator for the most iconic chassis BMW ever
              made. Spec it, share it, source the parts.
            </p>
          </div>
        </div>
      </div>

      {/* Right: sign-in card */}
      <div className="relative flex items-center justify-center px-6 py-10">
        <div className="absolute inset-0 pointer-events-none opacity-25 lg:hidden">
          <img
            src={E30.heroWide}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-garage-950/85" />
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-20 w-[28rem] h-[28rem] rounded-full bg-accent/30 blur-[140px]" />
          <div className="absolute -bottom-40 -left-20 w-96 h-96 rounded-full bg-accent-gold/20 blur-[120px]" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-gold shadow-glow mb-4">
              <svg width="28" height="28" viewBox="0 0 64 64" fill="white">
                <path d="M10 38c0-2 2-4 4-4l6-1 4-7c1-2 3-3 5-3h18c2 0 4 1 5 3l4 7 4 1c2 0 4 2 4 4v6c0 1-1 2-2 2h-6a4 4 0 1 1-8 0H22a4 4 0 1 1-8 0H8c-1 0-2-1-2-2v-6z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">E30 Forge</h1>
          </div>

          <div className="hidden lg:block mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-garage-400">
              Sign in
            </p>
            <h2 className="text-3xl font-bold mt-1.5">Enter the garage.</h2>
            <p className="text-garage-300 text-sm mt-2">
              Authorized access only.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-garage-800/70 backdrop-blur-xl border border-garage-700 rounded-2xl p-7 shadow-panel"
          >
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-garage-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-garage-900 border border-garage-600 rounded-lg px-4 py-3 text-garage-100 placeholder-garage-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                  placeholder="Brothers"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-garage-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-garage-900 border border-garage-600 rounded-lg px-4 py-3 text-garage-100 placeholder-garage-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                  placeholder="••••••••••"
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-accent-hot bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-accent to-accent-hot hover:shadow-glow active:scale-[0.99] text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Signing in…' : 'Enter the Garage'}
              </button>
            </div>

            <p className="text-[11px] text-garage-400 text-center mt-6 tracking-wide">
              Authorized access only · v0.1 proof-of-concept
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
