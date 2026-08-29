# Multi-stage build for @merchant/storefront (SPEC §17).
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
# next.config.ts only emits .next/standalone when this is set, because
# `next start` cannot serve that output and the local/e2e path uses it. The
# runtime stage below COPYs .next/standalone, so dropping this fails the build.
ENV NEXT_OUTPUT=standalone
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @merchant/db generate
RUN pnpm --filter @merchant/storefront build

FROM gcr.io/distroless/nodejs22-debian12 AS runtime
ENV NODE_ENV=production PORT=3002 HOSTNAME=0.0.0.0
WORKDIR /app
# Next standalone emits its own minimal node_modules plus a server.js. In a
# monorepo the tree is rooted at the workspace, so the app sits under apps/.
COPY --from=build /app/apps/storefront/.next/standalone ./
COPY --from=build /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build /app/apps/storefront/public ./apps/storefront/public
EXPOSE 3002
CMD ["apps/storefront/server.js"]
