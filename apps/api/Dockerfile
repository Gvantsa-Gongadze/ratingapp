# Build context is the repo root (pnpm workspace), e.g.:
#   docker build -f apps/api/Dockerfile .

FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @ratingapp/shared-types build && pnpm --filter @ratingapp/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared-types ./packages/shared-types
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api

EXPOSE 3000
# Runs pending migrations, then starts the server. Safe to run on every
# boot for a single-instance deploy — TypeORM tracks what's already applied.
CMD sh -c "pnpm run migration:run:prod && node dist/main.js"
