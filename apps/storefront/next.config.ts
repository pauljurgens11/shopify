import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Next only reads .env from its own directory. The monorepo keeps ONE .env at
// the root (SPEC §5), so load it here, before the app boots.
const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  reactStrictMode: true,
  // Required for the Dockerfile: pnpm's node_modules is a symlink farm into the
  // store, so copying it between build stages produces a broken tree. Standalone
  // emits a self-contained server with only the files actually imported.
  output: 'standalone',
  // In a monorepo, file tracing must start at the workspace root or standalone
  // silently omits the workspace packages this app imports.
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  transpilePackages: ['@merchant/config', '@merchant/contracts', '@merchant/theme-engine'],
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default config;
