# Multi-stage build for @merchant/admin (SPEC §17).
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
# next.config.ts inlines these into the client bundle as NEXT_PUBLIC_* at
# build time, so the image is bound to a deployment's public URLs. Defaults
# match dev; docker-compose.prod.yml overrides them from BASE_DOMAIN.
ARG API_URL=http://api.lvh.me:3001
ARG STOREFRONT_PROTOCOL=http
ARG STOREFRONT_BASE_DOMAIN=lvh.me:3002
ENV API_URL=$API_URL \
    STOREFRONT_PROTOCOL=$STOREFRONT_PROTOCOL \
    STOREFRONT_BASE_DOMAIN=$STOREFRONT_BASE_DOMAIN
# next.config.ts only emits .next/standalone when this is set, because
# `next start` cannot serve that output and the local/e2e path uses it. The
# runtime stage below COPYs .next/standalone, so dropping this fails the build.
ENV NEXT_OUTPUT=standalone
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @merchant/db generate
RUN pnpm --filter @merchant/admin build

FROM gcr.io/distroless/nodejs22-debian12 AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# Next standalone emits its own minimal node_modules plus a server.js. In a
# monorepo the tree is rooted at the workspace, so the app sits under apps/.
COPY --from=build /app/apps/admin/.next/standalone ./
COPY --from=build /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /app/apps/admin/public ./apps/admin/public
EXPOSE 3000
CMD ["apps/admin/server.js"]
