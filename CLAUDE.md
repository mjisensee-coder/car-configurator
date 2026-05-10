# E30 Forge — Architecture Reference

A 3D BMW E30 configurator. Built as a polished proof of concept, but
architected for upgrades: every external touch point is hidden behind a
narrow interface so it can be swapped without rippling through the app.

This file is for engineers (and Claude) extending the codebase.

---

## Stack

- React 18, Vite, TypeScript (strict)
- React Three Fiber + drei for the 3D scene
- React Router v6 for routing
- Tailwind CSS for styling
- html2canvas for build screenshots
- Express for the production runtime (Railway / Docker)

## Top-level layout

```
src/
  auth/           Auth context, login page, route guard
  catalog/        Parts catalog page (browse, filter, sort)
  components/     Shared, page-agnostic UI (NavBar, etc.)
  configurator/   Main configurator route + 3D scene
    models/       Model loader interface + placeholder car
    parts/        Per-category part swap components
  data/           JSON mocks (parts, builds)
  gallery/        Community gallery page
  services/       Data access layer — the only thing that touches `data/`
  types/          Domain interfaces
  App.tsx         Router + provider wiring
  main.tsx        Entry point
  styles.css      Tailwind directives + globals
```

---

## The three swap points

### 1. Auth (`src/auth/`)

`AuthContext` exposes `{ user, isAuthenticated, signIn, signOut }`. The
current `signIn` checks a hardcoded credential pair.

**To swap to OAuth/JWT:**

- Replace the body of `signIn` in `AuthContext.tsx` with your provider
  call. Keep the return type (`Promise<boolean>`) and the shape of
  `AuthUser`.
- `LoginPage` and `ProtectedRoute` need no changes.

### 2. Data (`src/services/`)

Every data read in the app goes through one of three services:

- `partsService.getAllParts() / getPartById() / getPartsByCategory() / searchParts()`
- `galleryService.getAllBuilds() / getBuildById()`
- `buildService.resolveConfig() / encodeConfig() / decodeConfig() / buildShareUrl()`

Today these read from JSON in `src/data/`. **To swap to an API (Turn 14,
ECS, your own backend):** change the implementation of the service —
the function signatures are the contract. Pages and components don't
import JSON anywhere.

### 3. 3D Model (`src/configurator/models/`)

The configurator scene mounts a single car component that consumes the
current `CarConfig` from context. The default is `<RealCar />` which loads
**"BMW M3 E30" by Artem P** from Sketchfab (CC BY 4.0, attributed in the
footer + scene overlay).

**The contract** (see `models/types.ts`) is conceptual: whatever model
you mount must respect the config's:

- `paintId` → drives body material color & metallic
- `wheelId` → 4 wheels at the corners reflect the chosen style
- `exhaustId` → tip mesh behind rear bumper reflects the chosen style
- `stickerId` → side decal reflects the chosen sticker
- `rideHeight` → body Y-offset

**RealCar implementation notes:**

- Loads `/public/models/e30/scene.gltf` (multi-file glTF, ~27MB total).
- Hides the GLB's wheels, brake discs, axles, suspension, and exhaust;
  captures the wheel-hub world positions before hiding so our procedural
  `<Wheel>` components anchor at the same X/Z. This keeps the wheel-style
  swap UX wired to real geometry choices.
- Recolors the shared `body` material in place (one mutation recolors all
  24 body panels). The material is *cloned* on first mount so the drei
  GLB cache isn't permanently mutated.
- Auto-scales by bounding box to a 4.32m target length, so model-unit
  variations don't require manual tweaking.
- Side decals (`<BodyDecal>`) are deliberately *not* applied on the real
  car: flat planes don't conform to curved doors. v2 work: use
  `THREE.DecalGeometry` projected onto the side panel meshes.

**Fallback:** `PlaceholderCar.tsx` remains in the repo and works
standalone — useful while iterating offline or for capturing a
deterministic non-textured screenshot. To use it, swap the import in
`Scene.tsx`.

**To swap to a different GLB:**

1. Drop the new model into `/public/models/<name>/`.
2. Update `MODEL_URL` in `RealCar.tsx`.
3. Adjust `HIDDEN_GROUPS` and `WHEEL_ANCHOR` regexes to match the new
   model's node names. Use `python3 /tmp/inspect_gltf.py` (or `npx
   gltfjsx`) to discover them.
4. Update the footer + scene-overlay attribution to match the new
   author + license.

The sidebar, summary panel, and routing are untouched.

---

## State flow

```
ConfiguratorContext ── reducer ──┐
                                 ├─→ Scene (reads config) ─→ <PlaceholderCar config={...} />
                                 ├─→ Sidebar (reads + dispatches)
                                 └─→ SummaryPanel (reads + resolves prices)
```

`CarConfig` (in `types/index.ts`) is the single serializable build state.
Everything else — selected parts, total cost, screenshot, share link —
is derived from it. That's why a build can round-trip through a base64
URL fragment (see `buildService.encodeConfig` / `decodeConfig`).

## Auth flow

Routes under `/*` are wrapped in `<ProtectedRoute>`. If unauthenticated,
it `<Navigate>`s to `/login` and stashes the original path in
`location.state.from`, so login redirects back where the user was going.

Session is in-memory by design (per spec). Refreshing the page sends the
user back to login.

## Routing

| Path         | Page                | Notes                                      |
|--------------|---------------------|--------------------------------------------|
| `/login`     | `LoginPage`         | Public                                     |
| `/configure` | `ConfiguratorPage`  | Default after sign-in. Decodes `?build=`.  |
| `/gallery`   | `GalleryPage`       | Click a build → loads into configurator    |
| `/catalog`   | `CatalogPage`       | Browse all parts, filter & sort            |
| `/`          | redirect → /configure |                                          |

## Sharing builds

`SummaryPanel` → "Share" button:

1. `encodeConfig(config)` → base64 string
2. `${origin}/configure?build=<encoded>` is copied to clipboard
3. Receiving end: `ConfiguratorPage` reads `?build=` on mount, decodes,
   and dispatches `loadConfig`. The query param is then stripped to keep
   the URL clean.

## Production runtime

`server.js` is an Express static server with SPA fallback and a
`/healthz` endpoint that Railway probes. The `Dockerfile` is a standard
two-stage build: install + `vite build` in stage 1, copy `dist/` and
runtime deps to a fresh Node image in stage 2.

## Adding a new part category

1. Add the slug to `PartCategory` in `types/index.ts`.
2. Add records in `data/partsCatalog.json`. Use the `renderHint` field
   for any 3D-relevant data (color, style key, etc.).
3. Create the swap component in `configurator/parts/<NewCategory>.tsx`.
4. Mount it inside `PlaceholderCar.tsx` at the right anchor.
5. Add a panel section in `Sidebar.tsx`.

## Things deliberately not done (and why)

- **No localStorage / sessionStorage.** Spec says auth is in-memory.
- **No real GLB.** Spec says placeholder primitives — the scaffolding is
  what matters until the model file is sourced.
- **No backend, no auth provider.** Same reason — clean swap point now,
  defer the bake-off later.
- **No tests.** This is a polished POC; add a Vitest setup the day you
  get a real model and a real auth provider.
