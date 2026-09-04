import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/server/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
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
