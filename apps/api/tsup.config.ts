import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  sourcemap: true,
  // Workspace packages export raw TypeScript, so they must be bundled in rather
  // than left as runtime imports.
  noExternal: [/^@merchant\//],
});
