import type { MetadataRoute } from 'next';
import { getAllParts } from '@/server/queries';

/**
 * Sitemap covering the public, indexable surface: catalog, part pages,
 * gallery and heritage. /configure, /admin and /login are excluded — they
 * are sign-in gated or useless to a crawler.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://e30forge.app';
  const parts = await getAllParts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/catalog`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/gallery`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/heritage`, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const partRoutes: MetadataRoute.Sitemap = parts.map((part) => ({
    url: `${base}/parts/${part.id}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...partRoutes];
}
