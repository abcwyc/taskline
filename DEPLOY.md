# Deploying Circle

Circle is now a full application: Next.js 15 (App Router) + a Prisma/PostgreSQL
backend + Auth.js credentials login. Everything the UI shows is stored in the
database.

## What you need

- **PostgreSQL 14+**
- **Node 22** (only to build / seed — the runtime image is self-contained)
- An `AUTH_SECRET` — generate with `npx auth secret`

## Environment

Copy `.env.example` → `.env` and fill in:

| var               | notes                                                    |
| ----------------- | -------------------------------------------------------- |
| `DATABASE_URL`    | Postgres connection string                               |
| `AUTH_SECRET`     | **required**, `npx auth secret`                          |
| `AUTH_URL`        | public URL of the app, e.g. `https://circle.example.com` |
| `AUTH_TRUST_HOST` | `true` behind a proxy / in Docker                        |

## Option A — Docker Compose (simplest)

```bash
cp .env.example .env          # set AUTH_SECRET (and AUTH_URL for prod)
docker compose up -d --build  # starts postgres + web, runs migrations on boot
```

The `web` container runs `prisma migrate deploy` on every start (see
`docker-entrypoint.sh`), so schema changes ship with the image.

**Bootstrap the workspace** (one time — there's no self-serve sign-up yet). From
a checkout on the host, against the compose Postgres (published on `:5432`):

```bash
pnpm install
DATABASE_URL="postgresql://circle:circle@localhost:5432/circle" pnpm db:seed
```

This creates the demo workspace + 22 users. Log in as
`leonelngoya@gmail.com` / `password` (override with `SEED_PASSWORD`).

App: <http://localhost:3000>

## Option B — build the image yourself

```bash
docker build -t circle .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/circle" \
  -e AUTH_SECRET="$(npx auth secret | tail -1)" \
  -e AUTH_URL="https://circle.example.com" \
  -e AUTH_TRUST_HOST=true \
  circle
```

## Option C — bare Node (no Docker)

```bash
pnpm install
pnpm db:migrate        # or: pnpm prisma migrate deploy  (prod)
pnpm db:seed           # one-time workspace bootstrap
pnpm build
pnpm start             # next start, on PORT (default 3000)
```

## Migrations

- Dev: `pnpm db:migrate` (creates + applies a migration from schema changes).
- Prod / CI / container: `prisma migrate deploy` (applies committed migrations,
  never generates).
- The `prisma/migrations/` directory is committed and is the source of truth.

## Notes / current limitations

- **Sign-up**: no self-serve registration yet — users are created by the seed.
  Add an invite flow or a `create-user` script for real onboarding.
- **Single workspace**: the schema is org-scoped but the UI has one workspace
  (the `[orgId]` segment resolves to the signed-in user's membership).
- **Agent** page: still a client-side canned-reply mock — wiring a real LLM is
  out of scope of the backend migration.
- **Reviews**: read-only (no VCS integration).
- File uploads / attachments are not implemented (schema has the columns).
