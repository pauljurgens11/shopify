#!/usr/bin/env node
/**
 * `.env.example` must be exhaustive (SPEC §5): every var read by
 * packages/config/src/env.ts appears there, and nothing extra rots in it.
 *
 * Twenty agents adding env vars is exactly how a "works on my machine" repo is
 * born, so this is a required CI check. It is deliberately dumb: regex over the
 * zod schema object, no TypeScript execution, no dependencies.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const envTs = readFileSync(join(root, 'packages/config/src/env.ts'), 'utf8');
const example = readFileSync(join(root, '.env.example'), 'utf8');

// Keys in the zod schema: lines like `  DATABASE_URL: z.string()...`
const schemaKeys = new Set([...envTs.matchAll(/^\s{2}([A-Z][A-Z0-9_]*)\s*:/gm)].map((m) => m[1]));

// Keys in .env.example: `KEY=` at the start of a line, comments ignored.
const exampleKeys = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]));

const missing = [...schemaKeys].filter((k) => !exampleKeys.has(k)).sort();
const extra = [...exampleKeys].filter((k) => !schemaKeys.has(k)).sort();

if (missing.length === 0 && extra.length === 0) {
  console.log(`env parity ok — ${schemaKeys.size} vars`);
  process.exit(0);
}

if (missing.length) {
  console.error('\nIn env.ts but missing from .env.example:');
  for (const k of missing) console.error(`  - ${k}`);
  console.error('\n  Add each one with a working local default.');
}
if (extra.length) {
  console.error('\nIn .env.example but not parsed by env.ts:');
  for (const k of extra) console.error(`  - ${k}`);
  console.error('\n  Either add it to the zod schema or delete the stale line.');
}
console.error('\nSee CLAUDE.md §2 rule 7.\n');
process.exit(1);
