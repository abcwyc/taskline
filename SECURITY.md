# Security notes for operators

## What's in place

- **AuthN** — Auth.js credentials (bcrypt), JWT sessions, edge middleware guards
  every page; API routes return JSON 401.
- **AuthZ** — role-based: `ADMIN` (members/roles/teams/invites), `MEMBER`
  (content), `GUEST` (read + comment). Enforced server-side on every write
  route (`requireWrite` / `requireAdmin` in `lib/api/context.ts`).
- **Input** — request bodies are Zod-validated on the main write routes;
  foreign-key ids are checked to belong to the caller's workspace before use
  (`lib/api/ownership.server.ts`). DB errors are never returned to clients.
- **Registration** — invite-only by default (`SIGNUP_MODE`). The first account
  bootstraps as ADMIN; gate it with `BOOTSTRAP_SECRET` on a public deploy.
- **Uploads** — per-file and per-workspace size caps; `Content-Length` checked
  before buffering; downloads served `Content-Disposition: attachment` +
  `nosniff`.
- **Headers** — HSTS, `X-Frame-Options: DENY`, `nosniff`, baseline CSP,
  `Referrer-Policy`, `Permissions-Policy` (`next.config.ts`).
- **Concurrency** — issue-number allocation is serialized per workspace.

## Known gaps — review before going public

- **No rate limiting** on sign-in / sign-up / API. Put the app behind a proxy or
  WAF that does (fail2ban, nginx `limit_req`, Cloudflare, …).
- **No email verification, password reset, MFA, or session revocation UI.**
  Accounts are only as trustworthy as whoever holds the invite link.
- **No account-lockout** on repeated failed logins.
- **Zod coverage is partial** — issues, projects, comments, invites and
  `/api/me` are validated; the smaller CRUD routes (cycles, labels, views,
  documents, initiatives, team edits) still rely on server-layer checks +
  error sanitization. Finish porting them to `lib/api/schemas.ts`.
- **Dependency audit** — `pnpm audit --prod` still reports build-time-only
  advisories (postcss/nanoid via Next, deepmerge-ts via the Prisma CLI, lodash
  via recharts). None are reachable at runtime; clear them by tracking Next
  releases and moving recharts to v3.
- **Attachments** are not virus-scanned.
- **Single workspace** — cross-tenant isolation is not exercised; the FK
  ownership checks are the groundwork for when it is.
- **No audit log export, backups, or monitoring** ship with the repo.

## Reporting

This is a template/demo derivative — send issues to whoever operates your
deployment.
