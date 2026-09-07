# Circle

Circle is a self-hosted, Linear-inspired project-management application built
with Next.js, PostgreSQL, Prisma, Auth.js, and React. Issues, projects, teams,
cycles, initiatives, triage, saved views, members, invitations, notifications,
comments, and attachments are persisted in PostgreSQL/local storage.

The supported production shape is a **small, single-workspace, single-instance
deployment**. Circle is not yet a multi-tenant SaaS or a horizontally scalable
service. See [DEPLOY.md](./DEPLOY.md) and [SECURITY.md](./SECURITY.md) before
putting it on a network.

## What works

- Credentials authentication, invite-only registration, and ADMIN/MEMBER/GUEST
  authorization
- Issue, project, initiative, cycle, team, member, label, view, and triage flows
- Comments, activity, subscriptions, in-app notifications, and attachments
- Docker/Compose deployment, health checks, migrations, CI, security headers,
  backup/restore helpers, cycle snapshots, and basic abuse throttling

Agent, Reviews/VCS integration, email/push delivery, API keys, passkeys, and most
third-party integrations are intentionally unavailable in this build.

## Local development

Requirements: Node 22, pnpm 10, and PostgreSQL 14+.

```bash
cp .env.example .env
pnpm install
pnpm exec prisma migrate deploy
pnpm create-admin you@example.com 'a-strong-password'
pnpm dev
```

Open <http://localhost:3000>. Do not run `pnpm db:seed` against a production
database; it creates demonstration accounts and content.

## Docker Compose

Set `POSTGRES_PASSWORD`, `AUTH_SECRET`, and `AUTH_URL` in `.env`, then run:

```bash
docker compose up -d --build
```

Set a strong `BOOTSTRAP_SECRET` to create the first admin through `/sign-up` or
`POST /api/bootstrap`. Keep `SIGNUP_MODE=invite` and invite everyone else from
the Members page.

Back up the Compose database and attachment volume with:

```bash
pnpm backup
```

Detailed proxy, restore, and operational instructions live in
[DEPLOY.md](./DEPLOY.md).

## Quality checks

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm exec prettier --check .
pnpm test
pnpm build
pnpm audit --prod
```

Database integration tests require `TEST_DATABASE_URL` pointing to a disposable,
migrated PostgreSQL database. CI provisions one automatically.

## Architecture

- `app/` — pages, route handlers, and auth-protected workspace layout
- `lib/api/*.server.ts` — server-side domain and persistence logic
- `lib/api/*.ts` — client DTO adapters and HTTP calls
- `store/` — hydrated Zustand caches and optimistic mutations
- `prisma/` — schema, migrations, and optional demonstration seed
- `components/` — product UI; legacy `mock-data/` modules still provide display
  types, icon registries, and seed fixtures

Read [AI_GUIDE.md](./AI_GUIDE.md) before making structural changes.
