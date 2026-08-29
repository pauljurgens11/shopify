/**
 * Same bootstrap the API tests use: CI provides DATABASE_URL as job env,
 * locally it lives in the root `.env`. `loadEnvFile` never overrides an
 * already-set variable, so loading unconditionally is safe in both places.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
