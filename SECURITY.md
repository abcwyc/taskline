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

## Known gaps — review before going public

- **No rate limiting** on sign-in / sign-up / API. Put the app behind a proxy or
  WAF that does (fail2ban, nginx `limit_req`, Cloudflare, …).
- **No email verification, password reset, MFA, or session revocation UI.**
  Accounts are only as trustworthy as whoever holds the invite link.
- **No account-lockout** on repeated failed logins.
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
- **No audit log export, backups, or monitoring** ship with the repo.

## Reporting

This is a template/demo derivative — send issues to whoever operates your
deployment.
