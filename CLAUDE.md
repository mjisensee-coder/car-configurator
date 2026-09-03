# E30 Forge — Architecture Reference

A 3D BMW E30 configurator. Built as a polished proof of concept, but
architected for upgrades: every external touch point is hidden behind a
narrow interface so it can be swapped without rippling through the app.

This file is for engineers (and Claude) extending the codebase.

---

## Stack

- Next.js 16 (App Router) + React 19
- Postgres via `pg`, with a bundled-JSON fallback
- Vitest for tests, pg-mem for SQL without a server
- React Three Fiber 9 + drei 10 + three 0.185 for the 3D scene
- Tailwind CSS for styling
- html2canvas for build screenshots
- Deploys to Vercel or to Railway/Docker from the same tree

## Top-level layout

```
db/                 schema.sql + operational scripts (apply, seed)
scripts/            asset pipeline (HDR baking, KTX2 encoding, transcoder)
tests/              Vitest suite — see tests/README.md for scope
src/
  app/              App Router — routes, layouts, API route handlers
    (shell)/        everything inside the NavBar chrome
    api/            route handlers (catalog, fitment, AI proxies, health)
  server/           server-only modules: db pool, SQL queries, AI proxies
  auth/             Auth context, login page, client-side gate
  catalog/          Catalog filters + part card (server components)
  components/       Shared, page-agnostic UI (NavBar, Footer)
  configurator/     3D studio
    environments/   Scene presets, baked HDR loader, KTX2 floor mask
    models/         Model loader + placeholder car
    parts/          Per-category part swap components
    renderer/       WebGL / WebGPU backend selection
  data/             JSON mocks + the fallback catalog
  gallery/          Community gallery (client island)
  services/         Client-side data access + hydration store
  types/            Domain interfaces
```

---

## Public vs gated routes

This is the one behavioural change the Next migration introduced, and it
is deliberate. Server rendering only pays for itself if a crawler can
reach the page, so the browsable surface is now public:

| Path            | Rendering            | Auth   |
|-----------------|----------------------|--------|
| `/catalog`      | Server, per-request  | Public |
| `/parts/[id]`   | Static (SSG) + ISR   | Public |
| `/gallery`      | Static + ISR         | Public |
| `/heritage`     | Static               | Public |
| `/configure`    | Client-only (no SSR) | Gated  |
| `/admin`        | Client-only (no SSR) | Gated  |
| `/login`        | Static, `noindex`    | Public |

`/configure` and `/admin` are wrapped in `<RequireAuth>`, a client-side
gate — the session is in-memory by design, so the server cannot know who
is signed in. Everything else renders on the server with real
`<title>`/`<meta>`, part pages emit Product JSON-LD, and `sitemap.ts`
lists the indexable set.

The configurator is loaded with `dynamic(..., { ssr: false })`. It is
WebGL from the first frame, so there is no HTML for a server to produce
and three touches `window` at module scope.

---

## The three swap points

### 1. Auth (`src/auth/`)

`AuthContext` exposes `{ user, isAuthenticated, signIn, signOut }`. The
current `signIn` checks a hardcoded credential pair.

**To swap to OAuth/JWT:** replace the body of `signIn`, keeping the
return type (`Promise<boolean>`) and the shape of `AuthUser`.
`LoginPage` and `RequireAuth` need no changes.

### 2. Data (`src/server/queries.ts`)

This is now Postgres. `db/schema.sql` defines three tables:

- `parts` — the catalog. Money is integer cents; `render_hint` is JSONB
  so a new part category needs no migration.
- `wheel_fitment` — one row per wheel, keyed to `parts.id`. Bolt
  pattern, offset, width, diameter, tire size and centre bore are
  columns, not prose, so "will it fit" is a query.
- `builds` — community builds. The whole `CarConfig` lives in one JSONB
  column, the same shape that round-trips through the `?build=` link.

**Every query falls back to the bundled JSON** (`src/data/fallbackCatalog.ts`)
when `DATABASE_URL` is unset or Postgres is unreachable. That is what
lets a fresh clone run with no database and keeps the catalog rendering
during an outage. `db/seed.mjs` seeds from those same JSON files, so the
fallback and a freshly seeded database never disagree.

Server components import `@/server/queries` directly — no HTTP hop. The
client store (`src/services/partsStore.ts`) keeps the old synchronous
`getPartById()` API because the 3D scene resolves parts during render;
a server component fetches once and `<CatalogHydrator>` fills the store
before any consumer reads it.

```bash
npm run db:schema   # apply schema.sql (idempotent)
npm run db:seed     # upsert the catalog (idempotent)
npm run db:verify   # schema + seed + the app's real SELECTs, in-memory
```

`db:verify` runs `tests/database.test.ts` against pg-mem, so the SQL can
be checked without a server. It parses `PART_SELECT`/`BUILD_SELECT` out
of `queries.ts` rather than copying them, so editing a join without
updating the test fails the test.

One pg-mem divergence is worked around in the schema: it treats
`NULL IN (...)` inside a CHECK as a violation where Postgres accepts it,
so `wheel_fitment.stance` spells out `stance IS NULL OR stance IN (...)`.

### 3. 3D Model (`src/configurator/models/`)

Unchanged: mount a component that respects `paintId`, `wheelId`,
`exhaustId`, `stickerId` and `rideHeight`. See `models/types.ts` and the
`RealCar` notes below.

**RealCar implementation notes:**

- Loads `/public/models/e30_v3.glb` (Meshopt-compressed).
- Hides the GLB's wheels, discs, axles and exhaust, capturing hub world
  positions first so the procedural `<Wheel>` components anchor to real
  geometry.
- Recolors the shared `body` material in place, cloned on first mount so
  the drei GLB cache is not permanently mutated.
- Auto-scales by bounding box to a 4.32 m target length.
- Side decals are projected with `THREE.DecalGeometry`.

---

## Rendering

### Backends

`src/configurator/renderer/` selects between WebGL 2 (default) and
WebGPU. React Three Fiber 9 accepts a promise-returning `gl` factory,
which is what lets the WebGPU adapter handshake finish before the first
frame; if it fails the factory returns a WebGLRenderer rather than
letting the canvas throw.

WebGPU is **opt-in**: the toggle only appears when `navigator.gpu`
exists, and `?renderer=webgpu` forces it. Two things to know:

- Selecting WebGPU selects a *pipeline*, not just an API — materials
  compile through the node/TSL system. Anything that patches GLSL by
  hand breaks. `MeshReflectorMaterial` is the one in this codebase, so
  `ProShowroom` swaps it for a plain metallic standard material under
  WebGPU.
- Verified only as far as initialisation: the renderer reports a true
  WebGPU backend. The scene under WebGPU has **not** been visually
  confirmed. Keep the default on WebGL until it has.

### Environments and baked IBL

Each scene's lighting comes from a baked equirectangular HDR in
`public/hdr/`, applied by `<BakedEnvironment>`. It replaced
`<Environment frames={Infinity}>`, which re-rendered a cubemap probe
every frame for a set of lights that never move.

`<BakedEnvironment>` loads in an effect and attaches the pre-filtered
map when it arrives, rather than suspending. drei's `<Environment files>`
suspends the whole scene subtree — including every light in it — so any
stall there leaves the studio on its loading fallback with an unlit car.

The maps are generated, not downloaded: `scripts/generate-hdri.mjs`
ray-traces each room analytically (same dimensions, same ceiling strips
as the visible geometry) so reflections line up with what the camera
sees. Surfaces are described as a hue tint plus an absolute radiance
level — they are most of the solid angle around the car, so describing
them as "dark grey × ambient" measures out almost black.

### Assets

```bash
npm run assets          # transcoder + HDR + KTX2, then verify
npm run assets:verify   # parse every output with the loaders the browser uses
```

- `scripts/copy-basis-transcoder.mjs` vendors the Basis transcoder from
  the installed three into `public/basis/`. drei's `useKTX2` otherwise
  fetches it from a CDN, which puts a third-party request on the
  critical path and decouples it from our three version.
- `scripts/encode-ktx2.mjs` writes `public/textures/floor-alpha.ktx2`,
  the radial mask that fades the reflective floor at its edges. With
  KTX-Software's `toktx` on PATH it emits UASTC; otherwise a
  zstd-supercompressed RGBA8 KTX2 (small over the wire, still
  uncompressed in VRAM). Install `ktx` and re-run for the real thing.

Assets are served with a one-year immutable cache header. Their
filenames are **not** content-hashed, so a regenerated asset will not
invalidate a client cache — hash the filename or bump a query string if
that matters.

---

## State flow

```
ConfiguratorContext ── reducer ──┐
                                 ├─→ Scene (reads config) ─→ <RealCar config={...} />
                                 ├─→ Sidebar (reads + dispatches)
                                 └─→ SummaryPanel (reads + resolves prices)
```

`CarConfig` (in `types/index.ts`) is the single serializable build state.
The renderer backend deliberately lives outside it: it is a property of
the machine, not the build, and putting it in `CarConfig` would bake it
into share links.

## API

| Route                    | Purpose                                  |
|--------------------------|------------------------------------------|
| `GET /api/parts`         | catalog, filter + sort                   |
| `GET /api/parts/[id]`    | one part                                 |
| `GET /api/builds`        | gallery, optional `?tag=`                |
| `GET /api/builds/[id]`   | one build                                |
| `GET /api/fitment/wheels`| fitment query + facet counts             |
| `GET /api/healthz`       | status, database reachability, features  |
| `POST /api/match-part`   | Gemini Vision photo match                |
| `POST /api/generate-part`| Gemini Vision parametric part spec       |
| `POST /api/generate-3d`  | image-to-3D: fal.ai → Tripo3D → billboard |

Server components skip these and query `@/server/queries` directly.

## Deployment

The same tree deploys two ways:

- **Vercel** — zero config. Set `DATABASE_URL` (point it at the Railway
  Postgres public URL), `NEXT_PUBLIC_SITE_URL`, and the API keys.
- **Railway / Docker** — `Dockerfile` builds with
  `NEXT_OUTPUT=standalone` and runs `node server.js` from the standalone
  bundle. `railway.json` probes `/api/healthz`.

`/api/generate-3d` polls its upstream for up to three minutes and
declares `maxDuration = 300`. Vercel caps that by plan (60s on Hobby); a
Docker deploy has no cap.

It also writes generated GLBs into `public/generated-parts/` so an
approved part survives the upstream URL expiry. Serverless filesystems
are read-only, so that write is best-effort: on failure the route serves
the upstream URL and says so in `note` rather than failing the job.

## Testing

```bash
npm test            # 139 tests, ~1s, no browser or database needed
npm run test:watch
```

Eight files under `tests/`, all in plain Node:

| Area | What it pins down |
|---|---|
| Share links | Encode/decode round trip and every malformed-link case |
| Catalog params | Query-string coercion — untrusted input that reaches an ORDER BY |
| Parts store | The seed-then-hydrate contract the 3D scene relies on |
| Queries | The JSON fallback path, which an outage and a fresh clone both hit |
| Database | Real schema, real seed, real SELECT text against in-memory Postgres |
| API | Route handler shapes, status codes, cache headers, validation |
| 3D backends | fal.ai → Tripo3D → billboard selection and degradation |
| Assets | RGBE encoder round trip plus every generated file, parsed with the browser's own loaders |

The asset tests exist because a broken encoder is invisible to code
review — a bad RLE run just shows up as a black showroom. They parse each
`.hdr` with both three's `HDRLoader` and three-stdlib's `RGBELoader`,
since drei's `<Environment>` uses the latter.

`tests/README.md` records what is deliberately out of scope and why.

## Adding a new part category

1. Add the slug to `PartCategory` in `types/index.ts`.
2. Add rows to `data/partsCatalog.json`, then `npm run db:seed`.
3. Create the swap component in `configurator/parts/<NewCategory>.tsx`.
4. Mount it inside `RealCar.tsx` at the right anchor.
5. Add a panel section in `Sidebar.tsx`.

## Things deliberately not done (and why)

- **No localStorage / sessionStorage.** Spec says auth is in-memory.
  This is also why the auth gate is client-side.
- **No auth provider.** Clean swap point now, bake-off later.
- **No component or browser tests.** The Vitest suite covers logic, SQL,
  the route handlers and the asset encoders — see the Testing section.
  Components and the 3D scene need a real browser, so the next step there
  is Playwright against `npm start`, not a jsdom harness that asserts
  mocks were called.
- **`next dev`'s CLAUDE.md generator is off** (`agentRules: false` in
  `next.config.mjs`) — it appends to this hand-maintained file.
