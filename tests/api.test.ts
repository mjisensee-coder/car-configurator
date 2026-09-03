import { beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getParts } from '@/app/api/parts/route';
import { GET as getPart } from '@/app/api/parts/[id]/route';
import { GET as getBuilds } from '@/app/api/builds/route';
import { GET as getBuild } from '@/app/api/builds/[id]/route';
import { GET as getFitment } from '@/app/api/fitment/wheels/route';
import { GET as getHealth } from '@/app/api/healthz/route';
import { POST as generate3D } from '@/app/api/generate-3d/route';

/**
 * The route handlers are the public read surface, so these cover the
 * contract a client can depend on: shapes, status codes, and the
 * validation that stops a query string from reaching SQL unchecked.
 *
 * They run without DATABASE_URL, so the handlers serve the JSON fallback —
 * which is the configuration a fresh clone and a database outage both hit.
 */
const request = (url: string) => new NextRequest(new URL(url, 'http://test.local'));
const params = <T,>(value: T) => ({ params: Promise.resolve(value) });

beforeAll(() => {
  delete process.env.DATABASE_URL;
  delete process.env.FAL_KEY;
  delete process.env.TRIPO3D_API_KEY;
  delete process.env.GEMINI_API_KEY;
});

describe('GET /api/parts', () => {
  it('returns the catalog with a count', async () => {
    const res = await getParts(request('/api/parts'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(body.parts.length);
    expect(body.parts.length).toBeGreaterThan(0);
  });

  it('filters by category', async () => {
    const res = await getParts(request('/api/parts?category=wheels'));
    const body = await res.json();
    expect(body.parts.every((p: { category: string }) => p.category === 'wheels')).toBe(true);
  });

  it('rejects an unknown category rather than silently ignoring it', async () => {
    const res = await getParts(request('/api/parts?category=spaceship'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('spaceship');
  });

  it('rejects a non-numeric maxPrice', async () => {
    const res = await getParts(request('/api/parts?maxPrice=cheap'));
    expect(res.status).toBe(400);
  });

  it('applies maxPrice when it is a number', async () => {
    const res = await getParts(request('/api/parts?maxPrice=250'));
    const body = await res.json();
    expect(body.parts.every((p: { price: number }) => p.price <= 250)).toBe(true);
  });

  it('sorts by price when asked', async () => {
    const res = await getParts(request('/api/parts?sort=price-desc'));
    const prices = (await res.json()).parts.map((p: { price: number }) => p.price);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => b - a));
  });

  it('ignores an unknown sort key instead of passing it to SQL', async () => {
    const res = await getParts(request('/api/parts?sort=price_cents;DROP'));
    expect(res.status).toBe(200);
    const names = (await res.json()).parts.map((p: { name: string }) => p.name);
    expect(names).toEqual([...names].sort((a: string, b: string) => a.localeCompare(b)));
  });

  it('is cacheable at the edge', async () => {
    const res = await getParts(request('/api/parts'));
    expect(res.headers.get('cache-control')).toContain('s-maxage');
  });
});

describe('GET /api/parts/[id]', () => {
  it('returns one part', async () => {
    const res = await getPart(request('/api/parts/wheels-bbs-rs'), params({ id: 'wheels-bbs-rs' }));
    expect(res.status).toBe(200);
    expect((await res.json()).part.brand).toBe('BBS');
  });

  it('includes fitment on a wheel', async () => {
    const res = await getPart(request('/api/parts/wheels-bbs-rs'), params({ id: 'wheels-bbs-rs' }));
    expect((await res.json()).part.fitment.boltPattern).toBe('4x100');
  });

  it('404s an unknown id', async () => {
    const res = await getPart(request('/api/parts/nope'), params({ id: 'nope' }));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/builds', () => {
  it('returns the gallery', async () => {
    const res = await getBuilds(request('/api/builds'));
    const body = await res.json();
    expect(body.count).toBe(body.builds.length);
    expect(body.builds.length).toBeGreaterThan(0);
  });

  it('filters by tag', async () => {
    const res = await getBuilds(request('/api/builds?tag=track'));
    const body = await res.json();
    expect(body.builds.every((b: { tags: string[] }) => b.tags.includes('track'))).toBe(true);
  });

  it('404s an unknown build', async () => {
    const res = await getBuild(request('/api/builds/nope'), params({ id: 'nope' }));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/fitment/wheels', () => {
  it('returns matches and facets', async () => {
    const res = await getFitment(request('/api/fitment/wheels'));
    const body = await res.json();
    expect(body.count).toBe(body.parts.length);
    expect(body.facets.boltPattern.length).toBeGreaterThan(0);
  });

  it('narrows by bolt pattern and diameter', async () => {
    const res = await getFitment(
      request('/api/fitment/wheels?boltPattern=4x100&diameter=15'),
    );
    const body = await res.json();
    expect(body.count).toBeGreaterThan(0);
    expect(
      body.parts.every((p: { fitment: { diameterInches: number } }) => p.fitment.diameterInches === 15),
    ).toBe(true);
  });

  it('returns an empty, well-formed result for an impossible query', async () => {
    const res = await getFitment(request('/api/fitment/wheels?boltPattern=5x120'));
    const body = await res.json();
    expect(body.count).toBe(0);
    expect(body.facets.boltPattern).toEqual([]);
  });

  it('ignores a non-numeric dimension instead of erroring', async () => {
    const res = await getFitment(request('/api/fitment/wheels?diameter=big'));
    expect(res.status).toBe(200);
    expect((await res.json()).count).toBeGreaterThan(0);
  });
});

describe('GET /api/healthz', () => {
  it('reports ok when no database is configured', async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const body = await res.json();
    // A missing database is not a failure — the JSON fallback covers it.
    expect(body.status).toBe('ok');
    expect(body.database.configured).toBe(false);
  });

  it('reports every feature flag and the resolved 3D backend', async () => {
    const body = await (await getHealth()).json();
    expect(body.features).toMatchObject({
      photoMatch: false,
      partGen: false,
      tripo3D: false,
      trellis: false,
    });
    expect(body.defaultBackend).toBe('billboard');
  });
});

describe('POST /api/generate-3d', () => {
  const post = (body: unknown) =>
    generate3D(
      new Request('http://test.local/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('400s without the required fields', async () => {
    const res = await post({ mimeType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('falls back to a billboard when no backend key is set', async () => {
    const res = await post({
      imageBase64: 'aGk=',
      mimeType: 'image/png',
      category: 'wheels',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.backend).toBe('billboard');
    expect(body.asset.kind).toBe('billboard');
    expect(body.asset.url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('tells the caller its requested backend was unavailable', async () => {
    const res = await post({
      imageBase64: 'aGk=',
      mimeType: 'image/png',
      category: 'wheels',
      backend: 'fal',
    });
    const body = await res.json();
    expect(body.backend).toBe('billboard');
    expect(body.requestedBackend).toBe('fal');
    expect(body.note).toContain('fal');
  });
});
