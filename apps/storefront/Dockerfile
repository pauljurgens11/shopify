# Multi-stage build for @merchant/storefront (SPEC §17).
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @merchant/db generate
RUN pnpm --filter @merchant/storefront build

FROM base AS runtime
ENV NODE_ENV=production PORT=3002
COPY --from=build /app/apps/storefront/.next ./.next
COPY --from=build /app/apps/storefront/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3002
USER node
CMD ["node_modules/.bin/next", "start", "--port", "3002"]
