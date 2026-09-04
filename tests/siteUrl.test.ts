import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSiteUrl } from '@/server/siteUrl';

/**
 * Canonical tags, Open Graph URLs and sitemap.xml all hang off this. A
 * wrong value is worse than a missing one: pointing every canonical at a
 * domain the project does not own tells a crawler the real page lives
 * elsewhere, which suppresses the pages that do exist.
 */
const KEYS = [
  'NEXT_PUBLIC_SITE_URL',
  'RAILWAY_PUBLIC_DOMAIN',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'PORT',
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('getSiteUrl', () => {
  it('prefers an explicit setting', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://e30forge.example';
    process.env.RAILWAY_PUBLIC_DOMAIN = 'ignored.up.railway.app';
    expect(getSiteUrl()).toBe('https://e30forge.example');
  });

  it('trims a trailing slash so joined paths do not double up', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://e30forge.example/';
    expect(getSiteUrl()).toBe('https://e30forge.example');
  });

  it("falls back to Railway's injected domain, adding the scheme", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = 'web-production.up.railway.app';
    expect(getSiteUrl()).toBe('https://web-production.up.railway.app');
  });

  it('does not double the scheme if the platform already includes one', () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = 'https://web-production.up.railway.app';
    expect(getSiteUrl()).toBe('https://web-production.up.railway.app');
  });

  it("falls back to Vercel's production URL", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'e30forge.vercel.app';
    expect(getSiteUrl()).toBe('https://e30forge.vercel.app');
  });

  it('falls back to localhost rather than inventing a domain', () => {
    process.env.PORT = '8080';
    expect(getSiteUrl()).toBe('http://localhost:8080');
  });

  it('ignores an empty string', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '   ';
    process.env.RAILWAY_PUBLIC_DOMAIN = 'web-production.up.railway.app';
    expect(getSiteUrl()).toBe('https://web-production.up.railway.app');
  });
});
