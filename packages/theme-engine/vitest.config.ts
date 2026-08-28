import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Sections are Server Components rendered to a string — no DOM needed.
  esbuild: { jsx: 'automatic' },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
