import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Next only reads .env from its own directory. The monorepo keeps ONE .env at
// the root (SPEC §5), so load it here, before the app boots.
const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  reactStrictMode: true,
  // The admin talks to the API from the browser, so the URL has to reach the
  // client bundle. `@merchant/config/env` is server-only (it would inline
  // DATABASE_URL and the vault key), so the one public value is republished
  // here instead of adding a NEXT_PUBLIC_ duplicate to the env schema.
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL ?? 'http://api.lvh.me:3001',
    // Same reason as the API URL: the AI builder's preview iframe points at the
    // real storefront origin, and that has to reach the browser. WS-F (F4).
    NEXT_PUBLIC_STOREFRONT_ORIGIN: `${process.env.STOREFRONT_PROTOCOL ?? 'http'}://${
      process.env.STOREFRONT_BASE_DOMAIN ?? 'lvh.me:3002'
    }`,
  },
  // The admin is served from admin.lvh.me in dev (CLAUDE.md §1), which Next
  // treats as cross-origin to its own /_next/* assets. Declaring the dev hosts
  // silences the warning now and keeps it working when Next starts enforcing it.
  allowedDevOrigins: ['admin.lvh.me', '*.lvh.me'],
  // Required for the Dockerfile: pnpm's node_modules is a symlink farm into the
  // store, so copying it between build stages produces a broken tree. Standalone
  // emits a self-contained server with only the files actually imported.
  output: 'standalone',
  // In a monorepo, file tracing must start at the workspace root or standalone
  // silently omits the workspace packages this app imports.
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  // Workspace packages ship TypeScript source with no build step, so Next has to
  // compile them itself (CLAUDE.md §3 — no cross-package build ordering).
  transpilePackages: ['@merchant/config', '@merchant/contracts', '@merchant/theme-engine'],
  eslint: { ignoreDuringBuilds: true }, // Biome is the linter (SPEC §3)
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default config;
