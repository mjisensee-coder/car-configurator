import type { Metadata } from 'next';
import { getAllBuilds } from '@/server/queries';
import { GalleryPage } from '@/gallery/GalleryPage';

export const metadata: Metadata = {
  title: 'Community builds',
  description:
    'Hand-picked BMW E30 builds from the community — paint, wheel and exhaust combinations you can load straight into the 3D studio.',
  alternates: { canonical: '/gallery' },
  openGraph: {
    title: 'Community BMW E30 builds',
    description:
      'Browse community E30 configurations and open any of them in the 3D build studio.',
    url: '/gallery',
  },
};

// Builds change rarely; serve from cache and refresh in the background.
export const revalidate = 300;

export default async function Page() {
  const builds = await getAllBuilds();
  return <GalleryPage builds={builds} />;
}
