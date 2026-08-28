# Multi-stage build for @merchant/api (SPEC §17).
#
# No bundler. Two things in this repo's design rule one out:
#   1. @fastify/autoload discovers routes by scanning the filesystem, so the
#      route tree must exist as real files at runtime (CLAUDE.md §3).
#   2. Workspace packages export raw TypeScript, so their deps get inlined into
#      an ESM bundle and the CJS/native ones (Prisma, argon2) break.
# The app therefore runs from source under tsx. Costs ~1s of startup compile;
# buys a production runtime that behaves exactly like dev.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
# Prisma's query engine links against OpenSSL, which node:*-slim does not ship.
# Without it Prisma falls back to a guessed target and fails on real queries.
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @merchant/db generate

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
# pnpm's node_modules is a symlink farm rooted at /app, so the whole tree is
# copied together to keep those links valid.
COPY --from=build /app ./
USER node
CMD ["pnpm", "--filter", "@merchant/api", "start"]
