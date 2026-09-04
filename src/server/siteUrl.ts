/**
 * Resolves the site's absolute origin, used for canonical links, Open
 * Graph URLs and sitemap.xml.
 *
 * The order matters. An explicit NEXT_PUBLIC_SITE_URL always wins; the
 * platform-injected domains are there so a deploy that nobody configured
 * still emits correct URLs instead of pointing every canonical tag at a
 * domain the project does not own — which is worse than having no
 * canonical at all, because it tells a crawler the real page lives
 * somewhere else.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  // Railway injects the service's public domain, host only.
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) return `https://${railway.replace(/^https?:\/\//, '')}`;

  // Vercel's equivalent for the production deployment.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;

  return `http://localhost:${process.env.PORT ?? 3000}`;
}
