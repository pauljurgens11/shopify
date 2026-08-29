import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// revalidate-token.test.ts reads SESSION_SECRET through env(), which parses the
// whole environment. Vitest does not read the repo-root .env the way the apps
// do (--env-file / loadEnvFile), so load it here when it exists. Variables
// already set in the shell win — that is how CI's job `env:` block overrides it.
const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
