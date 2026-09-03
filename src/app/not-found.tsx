import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-garage-950 text-garage-100 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-accent-gold">404</p>
      <h1 className="text-3xl font-bold mt-3 tracking-tight">
        That part left the garage.
      </h1>
      <p className="text-garage-300 mt-3 max-w-md">
        The page you asked for does not exist. The catalog is still where you
        left it.
      </p>
      <div className="mt-7 flex gap-3">
        <Link
          href="/catalog"
          className="bg-gradient-to-r from-accent to-accent-hot text-white font-semibold px-5 py-2.5 rounded-xl shadow-glow"
        >
          Browse catalog
        </Link>
        <Link
          href="/configure"
          className="border border-garage-600 hover:border-accent px-5 py-2.5 rounded-xl transition-colors"
        >
          Build studio
        </Link>
      </div>
    </div>
  );
}
