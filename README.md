# RatingApp

A daily random movie assignment and rating platform. Every user gets a random movie to watch. Rate it (or mark "didn't watch") and get the next one. Ratings feed global daily / weekly / monthly / all-time rankings. Create groups with friends for shared movie cycles and group stats.

Movie data powered by [TMDB](https://www.themoviedb.org/) — this product uses the TMDB API but is not endorsed or certified by TMDB.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite, TypeScript, TanStack Query, React Router |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL 16 |
| Cache / queues | Redis 7 (leaderboards, BullMQ jobs) |
| Movie data | TMDB API (with IMDb / Letterboxd link generation) |

## Monorepo layout

```
apps/
  api/    NestJS backend  (http://localhost:3000/api)
  web/    React frontend  (http://localhost:5173)
packages/
  shared-types/   DTOs shared between api and web
```

## Getting started

Prerequisites: Node 20+, pnpm 9+, Docker (for Postgres + Redis).

```bash
pnpm install

# start Postgres + Redis
pnpm db:up

# configure the API
cp apps/api/.env.example apps/api/.env
# then add your TMDB_API_KEY (free key: https://www.themoviedb.org/settings/api)

# run api + web together
pnpm dev
```

- API health check: http://localhost:3000/api/health
- Web: http://localhost:5173 (proxies `/api` to the backend)

## Deploying

See [DEPLOY.md](DEPLOY.md) — API + Postgres on Railway, web on Vercel.

## Build order / roadmap

1. ~~Project scaffold, monorepo, docker services~~
2. Database layer (Prisma or TypeORM) + migrations
3. Auth (register / login / JWT refresh)
4. TMDB movie pool import (quality-filtered `discover` sync)
5. Solo assignment cycle: assign → 24h window → rate / skip → next
6. Global rankings (Bayesian weighted score, Redis sorted sets)
7. Profiles + watch history
8. Groups: individual mode (solo cycles + aggregated stats)
9. Groups: sync mode (shared cycles, stall timeouts)
10. Notifications, public profiles, Patreon link

## Architecture notes

- **TMDB isolation:** only `apps/api/src/movies/tmdb/tmdb.service.ts` talks to TMDB. Everything else reads our own `movies` table.
- **Assignments are the state machine:** `active → rated | skipped | expired`. Only the assignments service transitions state and triggers the next cycle.
- **External links are generated, not fetched:** `imdb.com/title/{imdb_id}` and `letterboxd.com/tmdb/{tmdb_id}` come from IDs stored locally.
