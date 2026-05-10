/**
 * Production server. Serves the built Vite bundle from /dist and falls back
 * to index.html so React Router's BrowserRouter works on direct URL hits.
 *
 * Express isn't strictly required (we could use a static-only server), but
 * keeping it here gives us an obvious place to add API routes later — auth
 * upgrade, parts proxy to Turn 14, etc. — without changing infra.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist');

app.use(
  express.static(DIST, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

// SPA fallback — must come last
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`E30 Forge running on :${PORT}`);
});
