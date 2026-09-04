import type { Metadata, Viewport } from 'next';
import '@/styles.css';
import { Providers } from './providers';
import { getSiteUrl } from '@/server/siteUrl';

/**
 * Root layout. Server component — it renders the document shell and hands
 * off to <Providers> for the client-side auth and configurator contexts.
 *
 * Metadata here is the site-wide default; catalog, part, and gallery pages
 * override it per record, which is the point of moving off the SPA: those
 * pages now ship real HTML with real <title>/<meta> to a crawler.
 */

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'E30 Forge — BMW E30 Configurator',
    template: '%s | E30 Forge',
  },
  description:
    'Build your dream BMW E30 in 3D. Swap paint, wheels, exhaust and suspension, check wheel fitment, and price the build with verified vendor links.',
  applicationName: 'E30 Forge',
  openGraph: {
    type: 'website',
    siteName: 'E30 Forge',
    title: 'E30 Forge — BMW E30 Configurator',
    description:
      'Build your dream BMW E30 in 3D. Real parts, real fitment specs, real prices.',
    url: siteUrl,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-garage-950 text-garage-100 h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
