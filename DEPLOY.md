# Deploying RatingApp

Two pieces, two hosts:

- **API + Postgres** → [Railway](https://railway.app) — builds `apps/api/Dockerfile`, runs migrations on boot, then starts the server.
- **Web** → [Vercel](https://vercel.com) — static Vite build, config already in `vercel.json`.

Everything needed is already in the repo (`Dockerfile`, `railway.json`, `vercel.json`). What's left is account/dashboard setup, which only you can do.

## 1. API + Postgres on Railway

1. Sign in at railway.app → **New Project**.
2. **+ New → Database → PostgreSQL** to provision Postgres.
3. **+ New → GitHub Repo**, pick this repo. Railway will find `railway.json` at the repo root and build `apps/api/Dockerfile` — leave the service's root directory as the repo root (`/`), since the Dockerfile needs the whole pnpm workspace as build context.
4. On the new API service, open **Variables** and set:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Reference the Postgres plugin's connection string (Railway lets you pick it from a dropdown / `${{Postgres.DATABASE_URL}}`) |
   | `DATABASE_SSL` | `false` (Railway's own Postgres doesn't need it) |
   | `JWT_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `1d` |
   | `JWT_REFRESH_EXPIRES_IN` | `30d` |
   | `TMDB_API_KEY` | your key from themoviedb.org/settings/api |
   | `TMDB_BASE_URL` | `https://api.themoviedb.org/3` |
   | `RESEND_API_KEY` | your Resend key (optional — only needed for password-reset emails) |
   | `EMAIL_FROM` | `onboarding@resend.dev` or your verified sender |
   | `CORS_ORIGIN` | your Vercel URL — leave a placeholder for now, come back after step 2 |

   Don't set `PORT` — Railway injects it and the app already reads `process.env.PORT`.

5. Deploy. The Dockerfile's `CMD` runs pending migrations then starts the server, so a fresh database ends up fully migrated on first boot.
6. **Settings → Networking → Generate Domain** to get a public URL, e.g. `https://ratingapp-api-production.up.railway.app`. Your API lives at `<that domain>/api`.

## 2. Web on Vercel

1. Sign in at vercel.com → **Add New → Project**, import this repo.
2. Vercel should pick up `vercel.json`'s `installCommand` / `buildCommand` / `outputDirectory` automatically — leave the framework preset as-is and don't override those fields.
3. Add an environment variable: `VITE_API_URL` = `https://<your-railway-domain>/api` (from step 1.6). This is a build-time var — Vite bakes it into the bundle, so re-deploy if you change it later.
4. Deploy.
5. Copy the resulting Vercel URL, go back to Railway, and set `CORS_ORIGIN` to that exact URL (including `https://`, no trailing slash). Redeploy the API so CORS picks it up.

## 3. Smoke test

Visit your Vercel URL, register an account, and confirm you get a movie assignment — that alone proves the DB, TMDB key, and CORS are all correctly wired end to end.

## Notes

- **Redis** is provisioned in `docker-compose.yml` for local dev but nothing in the codebase uses it yet (see README roadmap) — don't bother provisioning it in production until a feature actually needs it.
- **Migrations run on every boot.** Fine for a single instance (TypeORM skips what's already applied). If you ever scale to multiple API instances, move this to a one-off release step instead of the boot command, e.g. `railway run pnpm --filter @ratingapp/api migration:run:prod`.
- **Rolling back a migration** needs the source-based CLI (ts-node), so do it locally with `DATABASE_URL` pointed at prod: `pnpm --filter @ratingapp/api migration:revert`.
