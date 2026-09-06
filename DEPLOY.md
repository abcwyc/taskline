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

**Bootstrap the workspace.** Two options:

- **Self-serve** — just open <http://localhost:3000/sign-up> and register. The
  first account becomes the workspace ADMIN; the sign-up flow creates the org,
  the workflow states, the default labels and a starter team (see
  `lib/api/bootstrap.ts`). Nothing else to run.
- **Demo data** — to start from the full sample dataset instead, run the seed
  once against the compose Postgres (published on `:5432`):

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
pnpm prisma migrate deploy   # apply committed migrations
pnpm build
pnpm start                   # next start, on PORT (default 3000)
# then register at /sign-up  (or `pnpm db:seed` first for demo data)
```

## Migrations

- Dev: `pnpm db:migrate` (creates + applies a migration from schema changes).
- Prod / CI / container: `prisma migrate deploy` (applies committed migrations,
  never generates).
- The `prisma/migrations/` directory is committed and is the source of truth.

## Notes / current limitations

- **Sign-up**: self-serve registration is enabled (`/sign-up`). The first
  account is ADMIN; later accounts join as MEMBER. Admins can send invite
  links from the Members page. Set `SIGNUP_MODE=invite` to require an invite
  for every account except the first. There is no email verification — invite
  links are delivered however you choose to share them.
- **Attachments**: stored on local disk under `UPLOAD_DIR` (`/app/uploads` in
  the container — the compose file mounts a named volume; back it up or point
  `UPLOAD_DIR` at shared storage). Max size `MAX_ATTACHMENT_BYTES` (10 MB
  default). Swap `lib/api/storage.ts` for S3/R2 if you'd rather not keep a
  volume.
- **Single workspace**: the schema is org-scoped but the UI has one workspace
  (the `[orgId]` segment resolves to the signed-in user's membership). Every
  sign-up joins that same workspace.
- **Agent** page: still a client-side canned-reply mock — wiring a real LLM is
  out of scope of the backend migration.
- **Reviews**: read-only (no VCS integration).
