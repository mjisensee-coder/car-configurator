import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

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
    <div className="min-h-screen w-full flex items-center justify-center bg-garage-grad px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 w-[28rem] h-[28rem] rounded-full bg-accent-gold blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-gold shadow-glow mb-4">
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
              <path
                d="M10 38c0-2 2-4 4-4l6-1 4-7c1-2 3-3 5-3h18c2 0 4 1 5 3l4 7 4 1c2 0 4 2 4 4v6c0 1-1 2-2 2h-6a4 4 0 1 1-8 0H22a4 4 0 1 1-8 0H8c-1 0-2-1-2-2v-6z"
                fill="white"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">E30 Forge</h1>
          <p className="text-garage-300 mt-2 text-sm">
            Premium BMW E30 build studio. Sign in to start configuring.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-garage-800/80 backdrop-blur-xl border border-garage-600 rounded-2xl p-8 shadow-panel"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-garage-300 mb-2">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-garage-900 border border-garage-600 rounded-lg px-4 py-3 text-garage-100 placeholder-garage-400 focus:outline-none focus:border-accent transition-colors"
                placeholder="Brothers"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-garage-300 mb-2">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-garage-900 border border-garage-600 rounded-lg px-4 py-3 text-garage-100 placeholder-garage-400 focus:outline-none focus:border-accent transition-colors"
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
              className="w-full bg-gradient-to-r from-accent to-accent-hot hover:shadow-glow text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in…' : 'Enter the Garage'}
            </button>
          </div>

          <p className="text-xs text-garage-400 text-center mt-6">
            Authorized access only · v0.1 proof-of-concept
          </p>
        </form>
      </div>
    </div>
  );
}
