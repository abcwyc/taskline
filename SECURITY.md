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
- **Registration** — invite-only by default (`SIGNUP_MODE`). The first admin is
  created only via `pnpm create-admin` or a `BOOTSTRAP_SECRET` typed into the
  form — never "whoever registers first".
- **Uploads** — the file is the raw request body, read as a stream and aborted
  the moment it passes the limit (so a chunked request with no `Content-Length`
  can't force unbounded buffering); per-file and per-workspace size caps;
  downloads served `Content-Disposition: attachment` + `nosniff`.
- **Headers** — HSTS, `X-Frame-Options: DENY`, `nosniff`, baseline CSP,
  `Referrer-Policy`, `Permissions-Policy` (`next.config.ts`).
- **Concurrency** — issue-number allocation is serialized per workspace.
- **Bootstrap safety** — CLI, web, and API first-admin creation share a
  PostgreSQL advisory transaction lock; operator secrets use constant-time
  comparison and new invite links use 256-bit random tokens.
- **Abuse throttling** — in-process sliding-window limits on sign-in, sign-up
  and invite creation (see gaps below for the caveat).
- **Scheduled jobs** — cycle snapshots require a dedicated `CRON_SECRET` bearer
  token and fail closed when it is unset.

## Known gaps — review before going public

- **Rate limiting is in-process only** (`lib/api/rate-limit.ts`): sign-in,
  sign-up and invite creation are capped per instance. It does not coordinate
  across instances or survive a restart — put a real limiter (nginx `limit_req`,
  Cloudflare, a Redis token bucket) in front for anything multi-node.
- **MFA, passkeys, API keys and password reset exist** (TOTP + WebAuthn under
  _Settings → Security & access_, admin-generated single-use reset links on the
  Members page, bearer API keys hashed at rest, session invalidation via
  `sessionVersion`). Email **verification** is still absent — accounts are only
  as trustworthy as whoever holds the invite link.
- **No hard account-lockout** — repeated failed logins are throttled, not locked.
- **Zod coverage** — all create/update routes now validate their body via
  `lib/api/schemas.ts`. Foreign-key ids are workspace-scoped for issues,
  projects, documents and initiatives; the rest resolve by org-scoped lookup.
- **Dependency audit** — `pnpm audit --prod` reports advisories in postcss +
  nanoid (Next's bundled CSS pipeline), deepmerge-ts (`@prisma/config`, CLI
  only) and lodash (recharts). postcss/nanoid _are_ bundled into
  `.next/standalone`, but the vulnerable code paths (source-map auto-loading,
  custom-alphabet generators) are not exercised at runtime; lodash's `_.template`
  is never called. Clear them by tracking Next releases and moving recharts to
  v3 (drops lodash). Do not ship without re-checking.
- **Attachments** are not virus-scanned.
- **Single workspace** — cross-tenant isolation is not exercised; the FK
  ownership checks are the groundwork for when it is.
- **No audit log export or monitoring stack** ships with the repo. Compose
  backup/restore helpers are included, but scheduling, off-host retention,
  PITR, and restore drills remain the operator's responsibility.

## Reporting

This is a template/demo derivative — send issues to whoever operates your
deployment.
