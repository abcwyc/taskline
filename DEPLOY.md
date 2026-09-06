# Deploying Circle

Circle is a Next.js 15 (App Router) app + Prisma/PostgreSQL backend + Auth.js
credentials login. The core project-management surface — issues, projects,
teams, cycles, initiatives, views, docs, triage, notifications, attachments — is
DB-backed. Some settings sub-pages and the Agent / Reviews / Integrations
surfaces are not yet functional (see **Not implemented** below).

> Read **SECURITY.md** before exposing this to the public internet.

## What you need

- **PostgreSQL 14+**
- **Node 22** (only to build / seed — the runtime image is self-contained)
- `AUTH_SECRET` (`npx auth secret`) and a strong DB password

## Environment

Copy `.env.example` → `.env` and fill in:

| var                 | notes                                                    |
| ------------------- | -------------------------------------------------------- |
| `AUTH_SECRET`       | **required**, `npx auth secret`                          |
| `AUTH_URL`          | public URL of the app, e.g. `https://circle.example.com` |
| `AUTH_TRUST_HOST`   | `true` behind a proxy / in Docker                        |
| `POSTGRES_PASSWORD` | **required** for compose; `DATABASE_URL` for bare Node   |
| `SIGNUP_MODE`       | `invite` (default) or `open`                             |
| `BOOTSTRAP_SECRET`  | optional — gate the first-admin sign-up                  |

## Option A — Docker Compose (simplest)

```bash
cp .env.example .env          # set AUTH_SECRET, POSTGRES_PASSWORD, AUTH_URL
docker compose up -d --build  # starts postgres + web, runs migrations on boot
```

The `web` container runs `prisma migrate deploy` on every start (see
`docker-entrypoint.sh`). Postgres is **not** published to the host; the `web`
service has a `/api/health` healthcheck.

**Create the first admin.** Registration is invite-only by default, and the
first account can only be created two ways — never "whoever registers first":

- **CLI (recommended):**
   ```bash
   docker compose exec web pnpm create-admin you@example.com 'a-strong-password' 'Your Name'
   ```
- **Web:** set `BOOTSTRAP_SECRET` in `.env`, then open
  <http://localhost:3000/sign-up> and enter that secret in the form.

After that, admins invite everyone else from the **Members** page. Set
`SIGNUP_MODE=open` if you actually want anyone to be able to register.

**Demo data (optional).** To start from the sample dataset, run the seed against
the compose database (it isn't published, so exec into the db container or add a
temporary port):

```bash
docker compose exec -T db psql -U circle -d circle < /dev/null   # sanity check
DATABASE_URL="postgresql://circle:<password>@localhost:5432/circle" pnpm db:seed
```

Demo login: `leonelngoya@gmail.com` / `password` (override with `SEED_PASSWORD`).

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
pnpm prisma migrate deploy            # apply committed migrations
pnpm build
pnpm create-admin you@example.com 'a-strong-password'
node .next/standalone/server.js       # the standalone server (PORT, default 3000)
```

(`.next/standalone` needs `.next/static` and `public/` copied next to it — the
Dockerfile does this; for a bare run, `cp -r .next/static public .next/standalone/`.)

## Migrations

- Dev: `pnpm db:migrate` (creates + applies a migration from schema changes).
- Prod / CI / container: `prisma migrate deploy` (applies committed migrations,
  never generates).
- The `prisma/migrations/` directory is committed and is the source of truth.

## Behind a reverse proxy

Terminate TLS at the proxy and forward `Host` / `X-Forwarded-*`. A request body
limit near `MAX_ATTACHMENT_BYTES` (nginx `client_max_body_size 12m;`) is still
good defence in depth, though the app now streams uploads and aborts oversized
ones itself. The app sends HSTS, `X-Frame-Options: DENY`, `nosniff`, a baseline
CSP and `Referrer-Policy` (see `next.config.ts`). Add rate limiting here —
there is none in the app.

## Roles

`ADMIN` manages members, roles, teams and invites. `MEMBER` creates and edits
content. `GUEST` is read-only but can comment. The first account is ADMIN;
promote others from the Members page.

## Not implemented

These render but do not do anything yet:

- **Agent** — client-side canned replies, no LLM.
- **Reviews** — read-only, no VCS integration.
- **Integrations / Connected accounts / Security (passkeys, API keys)** — UI only.
- 11 settings sub-pages (SLAs, releases, customer requests, emojis, …) show a
  "not available in this build" banner.
- **Notifications** are in-app only — no email/push delivery.

## Attachments

Stored on local disk under `UPLOAD_DIR` (`/app/uploads`; compose mounts a named
volume — back it up). Per-file cap `MAX_ATTACHMENT_BYTES` (10 MiB), per-workspace
cap `MAX_WORKSPACE_ATTACHMENT_BYTES` (2 GiB). Reimplement `lib/api/storage.ts`
for S3/R2.

## Single workspace

The schema is org-scoped but the UI serves one workspace; every account joins it.

## Operational gaps to close before production

- **CI** — `.github/workflows/ci.yml` runs typecheck / lint / tests / build /
  audit. Adapt for your host.
- **Tests** — `pnpm test` (vitest): unit tests always run; the RBAC / invite /
  admin-safety integration tests run when `TEST_DATABASE_URL` is set.
- **Not included** — metrics/tracing, structured log shipping, DB backup/PITR,
  rate limiting, error tracking. `/api/health` returns 200 only when the DB
  responds — wire it to your load balancer.
