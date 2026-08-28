# Multi-stage build for @merchant/api (SPEC §17).
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @merchant/db generate
RUN pnpm --filter @merchant/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/packages/db/generated ./generated
USER node
CMD ["node", "dist/server.js"]
