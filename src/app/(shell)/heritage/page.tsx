import type { Metadata } from 'next';
import { HeritagePage } from '@/heritage/HeritagePage';

export const metadata: Metadata = {
  title: 'E30 heritage',
  description:
    'The BMW E30 story — from the 1982 launch through the M3 homologation cars to the modern restomod scene.',
  alternates: { canonical: '/heritage' },
  openGraph: {
    title: 'BMW E30 heritage',
    description:
      'The BMW E30 story, from 1982 to the modern restomod scene.',
    url: '/heritage',
  },
};

export default function Page() {
  return <HeritagePage />;
}
