import { defineConfig } from 'vitest/config';
import path from 'node:path';

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
      // See tests/stubs/server-only.ts.
      'server-only': path.resolve(root, './tests/stubs/server-only.ts'),
    },
  },
  test: {
    // Everything under test is either pure logic, SQL against an in-memory
    // Postgres, or a binary encoder — none of it needs a DOM.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The 3D scene and React components are covered by neither: they need a
    // WebGL context and a browser, which is a different (heavier) harness.
    // See tests/README.md for what is deliberately out of scope.
    reporters: 'default',
  },
});
