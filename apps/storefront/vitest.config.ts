/**
 * The storefront's own tests need the root `.env`, the same way `next.config.ts`
 * does — the monorepo keeps exactly one (SPEC §5) and Vitest, like Next, only
 * looks in its own directory.
 *
 * `process.loadEnvFile` does not overwrite a variable that is already set, so
 * CI's job environment still wins over the checked-in `.env.example` copy.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
