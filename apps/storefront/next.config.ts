import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Next only reads .env from its own directory. The monorepo keeps ONE .env at
// the root (SPEC §5), so load it here, before the app boots.
const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  reactStrictMode: true,
  // Standalone is what the Dockerfile ships: pnpm's node_modules is a symlink
  // farm into the store, so copying it between build stages produces a broken
  // tree, and standalone emits a self-contained server with only the files
  // actually imported. It is OPT-IN, because `next start` — which `pnpm start`
  // and the Playwright suite both run — cannot serve a standalone build. Next
  // says so on every boot ("next start does not work with output: standalone"),
  // and the failure is real: Server Action responses abort mid-stream, so a
  // `revalidatePath` never reaches the client and the transition that fired it
  // never settles. The Dockerfiles set NEXT_OUTPUT=standalone; nothing else
  // should, and if it is ever dropped there the image build fails loudly on the
  // missing .next/standalone rather than shipping something subtly broken.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
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
