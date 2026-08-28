/**
 * Test bootstrap. Runs before every API test file.
 *
 * CI sets DATABASE_URL/REDIS_URL/SESSION_SECRET as job env; locally they live
 * in the root `.env`. `loadEnvFile` never overrides an already-set variable, so
 * loading it unconditionally is safe in both places.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

// Vitest already sets this; being explicit keeps `isProduction()` honest if a
// stray `.env` says otherwise.
process.env.NODE_ENV = 'test';

// A green run logs one line per request otherwise, which buries the assertion
// that actually failed. Fatal still gets through.
process.env.LOG_LEVEL = 'fatal';
