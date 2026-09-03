# E30 Forge

A premium 3D BMW E30 configurator. Spin the camera around your build,
swap paint, wheels, exhaust, suspension and decals in real time, check
wheel fitment, and get a parts list with links to ECS Tuning and Turner
Motorsport.

📦 **Repo:** <https://github.com/mjisensee-coder/car-configurator>

> **Status:** Polished proof-of-concept, now on Next.js with a Postgres
> catalog. See [CLAUDE.md](./CLAUDE.md) for the architecture deep-dive.

---

## Quick start

```bash
npm install
npm run assets
npm run dev
```

Open <http://localhost:3000>. No database is required — with
`DATABASE_URL` unset the catalog is served from the bundled JSON.

`npm run assets` generates the baked HDR environment maps, the KTX2 floor
mask and the Basis transcoder into `public/`. They are build outputs, so
run it once after cloning.

The build studio and admin page need a sign-in; the demo credentials are
in `src/auth/AuthContext.tsx`.

## Pages

Public, server-rendered and indexable:

- **Catalog** — every part, filterable by category and sortable by price.
  Filters live in the URL, so `/catalog?category=wheels` is a real page.
- **Part pages** — one per part, with Product structured data and, for
  wheels, the full fitment spec.
- **Community** — featured builds you can load with one click.
- **Heritage** — a magazine-style feature on the E30.

Sign-in required:

- **Configure** — the 3D studio.
- **Admin** — the part generation review queue.

## Connecting a database

```bash
cp .env.example .env       # then paste your DATABASE_URL
npm run db:schema          # create tables (idempotent)
npm run db:seed            # load the catalog (idempotent)
```

On Railway, add a Postgres service and use its `DATABASE_URL` from the
app and `DATABASE_PUBLIC_URL` from your laptop. The connection helper
picks the right TLS mode by inspecting the host.

Check it worked:

```bash
curl localhost:3000/api/healthz
curl "localhost:3000/api/fitment/wheels?boltPattern=4x100&diameter=15"
```

## What's modular

The interesting bit isn't the geometry, it's the seams:

| Boundary | Today                                  | Tomorrow                            |
|----------|----------------------------------------|-------------------------------------|
| Auth     | Hardcoded credential check             | OAuth / JWT — replace `signIn`      |
| Data     | Postgres, JSON fallback                | Any store — replace `server/queries`|
| 3D model | `e30_v3.glb` + procedural parts        | Any GLB — see CLAUDE.md             |
| Renderer | WebGL 2, WebGPU opt-in                 | WebGPU by default when it is ready  |

## Scripts

```bash
npm run dev             # Next dev server
npm run build           # production build
npm run start           # serve the production build
npm run typecheck       # tsc --noEmit

npm run db:schema       # apply db/schema.sql
npm run db:seed         # seed the catalog
npm run db:verify       # run schema + seed + real queries against pg-mem

npm run assets          # basis transcoder + HDR maps + KTX2 textures
npm run assets:verify   # parse each asset with the browser's own loaders
```

## Deploying

Vercel picks the project up with no configuration. For Railway or any
Docker host, the included `Dockerfile` builds a standalone bundle and
`railway.json` points the healthcheck at `/api/healthz`. Set
`DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, and optionally `GEMINI_API_KEY`
and `TRIPO3D_API_KEY`.
