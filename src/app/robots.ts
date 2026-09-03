import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://e30forge.app';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Gated or machine-only routes.
      disallow: ['/configure', '/admin', '/login', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
