# E30 Forge

A premium 3D BMW E30 configurator. Spin the camera around your build,
swap paint, wheels, exhaust, suspension, and decals in real time, and
get a parts list with affiliate links to ECS Tuning and Turner Motorsport.

🚗 **Live:** <https://web-production-92eeb.up.railway.app>
📦 **Repo:** <https://github.com/mjisensee-coder/car-configurator>

> **Status:** Polished proof-of-concept. The 3D model is built from
> Three.js primitives — drop a real GLB in later (see
> [CLAUDE.md](./CLAUDE.md) for the swap procedure).

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:5173> and sign in with:

| Field    | Value           |
|----------|-----------------|
| Username | `Brothers`      |
| Password | `CarVenture2026!` |

## Pages

- **Configure** — the main 3D studio. Rotate the camera, drop the ride
  height, click through paint colors, swap wheels.
- **Community** — featured builds you can load with one click.
- **Catalog** — every part in the database, filterable by category and
  sortable by price.

## What's modular

The interesting bit isn't the geometry, it's the seams. Three external
boundaries are each behind a single module so you can swap them later
without touching the rest:

| Boundary | Today                                     | Tomorrow                                |
|----------|-------------------------------------------|-----------------------------------------|
| Auth     | Hardcoded credential check                | OAuth / JWT — replace `signIn`          |
| Data     | JSON files in `src/data/`                 | Live API — replace service implementations |
| 3D model | Procedural primitives (`PlaceholderCar`)  | Real GLB — see CLAUDE.md                |

See [CLAUDE.md](./CLAUDE.md) for the architecture deep-dive.

## Available scripts

```bash
npm run dev         # Vite dev server
npm run build       # Type-check then production build → ./dist
npm run preview     # Preview the production build locally
npm run start       # Run the express server (after `npm run build`)
npm run typecheck   # tsc --noEmit
```

## Deploy

### Railway (recommended)

```bash
railway up
```

`railway.json` points at the `Dockerfile`; the platform handles the
rest. The container exposes port 8080 and serves `/healthz` for the
health probe.

### Docker (anywhere)

```bash
docker build -t e30-forge .
docker run -p 8080:8080 e30-forge
```

### Procfile (Heroku-style)

`Procfile` declares `web: node server.js`. Combine with
`npm run build` in your release step.

## Tech

React 18 · Vite · TypeScript (strict) · React Three Fiber · drei ·
React Router · Tailwind CSS · html2canvas · Express

## License

Private — proof of concept.
