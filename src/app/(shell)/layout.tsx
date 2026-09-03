import { NavBar } from '@/components/NavBar';

/**
 * Shell layout — everything except /login sits inside it.
 * Server component: the NavBar is the only client island.
 */
export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-garage-950 text-garage-100">
      <NavBar />
      {children}
    </div>
  );
}
