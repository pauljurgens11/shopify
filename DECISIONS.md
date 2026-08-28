# DECISIONS

Append-only. One line per decision. Never edit or delete an existing line.

Format: `YYYY-MM-DD | WS{X} | decision — rationale`

Log here when you: resolve a SPEC.md ambiguity, use the Polaris 20-minute escape hatch, make a breaking `packages/contracts` change (log BEFORE the change), stub against another workstream after being blocked >30 min, or build a minimal version of something SPEC.md §2 lists as out of scope.

---

2026-08-28 | WS-A | Internal packages export TypeScript source (`exports: "./*": "./src/*.ts"`) with no build step — removes cross-package build ordering, which is the most common way a parallel-agent monorepo deadlocks.
2026-08-28 | WS-A | Prisma multi-file schema (`prisma/schema/*.prisma`, one file per domain) instead of a single `schema.prisma` — a single schema file would be the single hottest merge conflict in the repo.
2026-08-28 | WS-A | `@node-rs/argon2` instead of `argon2` — prebuilt binaries, so no node-gyp toolchain in CI or in agent sandboxes. Same argon2id algorithm, satisfies SPEC §8.
2026-08-28 | WS-A | `packages/contracts` has no barrel `index.ts`; consumers import subpaths (`@merchant/contracts/products`) — a shared barrel is a guaranteed conflict point and hurts tree-shaking.
2026-08-28 | WS-A | Admin navigation, theme sections, and worker job registries are pre-created complete from SPEC §9/§12/§13 — agents fill leaf files instead of editing a shared registry array.
2026-08-28 | WS-A | PR-required CI is limited to lint + typecheck + unit + tenancy (fast); Playwright e2e and docker build run post-merge on `main` — required checks that take 10 min would serialize 20 agents behind the merge queue.
2026-08-28 | WS-A | React 19 with Polaris 13 despite its `react@^18` peer range — verified the 13.9.5 build uses no findDOMNode, defaultProps, or propTypes (the three things React 19 removed). SPEC §3 locks both Polaris 13 and Next 15, and Next 15 App Router requires React 19, so the peer range is stale rather than a real conflict. Allowed explicitly via pnpm.peerDependencyRules.
2026-08-28 | WS-A | Root `.env` is loaded explicitly per app — `--env-file` for api/worker, `process.loadEnvFile()` in next.config for admin/storefront. Next only reads `.env` from its own directory, so a single root `.env` (SPEC §5) is otherwise invisible to it.
2026-08-28 | WS-A | Admin pages are Client Components; Polaris needs React context and breaks the build inside a Server Component. Verified: admin and storefront both build clean on Next 15.5 + React 19.
2026-08-28 | WS-A | Postgres is published on host port 5433, not 5432 — a stock Postgres or another project's container commonly already owns 5432, and the resulting bind error is a confusing first-run failure. Container port is unchanged.
2026-08-28 | WS-A | Prisma generates to its DEFAULT output, not a custom dir — a custom path is imported relatively, so bundlers inline the CJS client and its dynamic require("fs") throws under ESM. As `@prisma/client` it stays external everywhere.
2026-08-28 | WS-A | api and worker run from TypeScript source under tsx in production; no bundler. @fastify/autoload discovers routes by scanning the filesystem, so a single-file bundle has no route tree, and bundling also inlines Prisma/argon2 and breaks them. Costs ~1s startup compile; buys prod behaviour identical to dev. Verified by running both in NODE_ENV=production.
2026-08-28 | WS-A | Next apps build with `output: 'standalone'` + `outputFileTracingRoot` at the workspace root — pnpm's symlinked node_modules does not survive a cross-stage Docker COPY, and without the tracing root standalone silently omits workspace packages.
