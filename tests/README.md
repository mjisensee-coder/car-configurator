# Tests

```bash
npm test           # everything, ~1s
npm run test:watch # re-run on change
npm run db:verify  # just the SQL suite
npm run assets:verify
```

Everything runs in plain Node. Nothing here needs a browser, a database
server, or a network connection, so the suite is safe to run in CI and on
a fresh clone.

## What each file covers

| File | Covers |
|---|---|
| `buildService.test.ts` | Share-link encode/decode, including every way a hand-edited link can be malformed; environment id sanitising and legacy remaps; ride-height → suspension product boundaries; price totals |
| `catalogParams.test.ts` | Coercion of the catalog's query string, which is untrusted input on a server-rendered path and feeds an ORDER BY |
| `partsStore.test.ts` | The seed-then-hydrate contract the 3D scene depends on for synchronous part lookups |
| `queries.test.ts` | The data layer on its JSON fallback path — the configuration a fresh clone and a database outage both hit |
| `database.test.ts` | `schema.sql`, the real seed statements, and the app's own SELECT text against an in-memory Postgres |
| `api.test.ts` | Route handler status codes, shapes, cache headers, and input validation |
| `ai.test.ts` | Image-to-3D backend selection and its degradation chain |
| `assets.test.ts` | The RGBE encoder round-tripped through both HDR loaders, and every generated map parsed with the loader the browser uses |
| `floorMask.test.ts` | The runtime-generated floor gradient that replaced the KTX2 texture |
| `siteUrl.test.ts` | Canonical/Open Graph/sitemap origin resolution across platforms |

## Two deliberate choices

**`database.test.ts` reads its SQL out of `src/server/queries.ts`.** A
copy of the query text here would pass while production broke. It parses
the `PART_SELECT` and `BUILD_SELECT` constants out of the source, so
editing a join without updating the test fails the test.

**It runs against pg-mem, not Postgres.** That catches syntax errors,
wrong column names and broken joins without a server. It does not
implement all of Postgres — no GIN planning, looser type coercion — so it
is not a substitute for running `npm run db:schema && npm run db:seed`
against a real database before a production deploy. One divergence is
already documented in `db/schema.sql`: pg-mem treats `NULL IN (...)` in a
CHECK as a violation where Postgres accepts it.

## Not covered

- **React components and the 3D scene.** Both need a browser: the scene
  needs a real WebGL context, and the components are thin wrappers over
  logic that is tested directly above. A jsdom harness would assert that
  mocks were called rather than that anything renders. If this grows,
  Playwright against `npm start` is the right tool, not jsdom.
- **The live third-party calls** to Gemini, fal.ai and Tripo3D. Backend
  *selection* is tested; the requests themselves are not mocked, because
  a mock of someone else's API asserts our assumptions rather than their
  behaviour. The route handlers degrade on error, and that path is
  tested.
- **WebGPU rendering.** Initialisation reports a true WebGPU backend, but
  the scene under it has not been visually confirmed. See CLAUDE.md.
