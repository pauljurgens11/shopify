# Multi-stage build for @merchant/admin (SPEC §17).
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @merchant/db generate
RUN pnpm --filter @merchant/admin build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/apps/admin/.next ./.next
COPY --from=build /app/apps/admin/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node_modules/.bin/next", "start", "--port", "3000"]
