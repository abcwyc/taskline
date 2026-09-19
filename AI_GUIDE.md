# Circle — Engineering Guide

This is the current architecture reference for humans and coding agents. Circle
started as a front-end template, but its primary product flows now use a real
Next.js API, PostgreSQL/Prisma persistence, Auth.js authentication, and
server-enforced roles.

## Product boundary

Circle currently supports one workspace per deployment and a small number of
users on one application instance. The schema is organization-scoped, but API
context still selects the user's first membership. Do not advertise or implement
multiple workspaces only in the UI: tenant selection must first be carried from
the route to every API request and verified against membership.

All product surfaces are enabled; `middleware.ts` only enforces authentication.
Externally-dependent features degrade explicitly instead of faking: the agent
requires `AGENT_LLM_*` env vars (503 + UI banner otherwise), email requires
SMTP env vars (silently skipped otherwise), and reviews are a local
paste-a-diff flow with no VCS integration. Do not reintroduce mock replies or
procedurally generated content on these surfaces.

## Stack and source of truth

| Concern                             | Source of truth                                               |
| ----------------------------------- | ------------------------------------------------------------- |
| Database model                      | `prisma/schema.prisma` and committed migrations               |
| Request context and roles           | `lib/api/context.ts`                                          |
| Server domain operations            | `lib/api/*.server.ts`                                         |
| Route validation                    | `lib/api/schemas.ts` and `app/api/**/route.ts`                |
| Client HTTP/DTO adapters            | `lib/api/*.ts`                                                |
| Client caches and optimistic writes | `store/*.ts`                                                  |
| UI/domain display types             | `mock-data/*.ts` plus component registries                    |
| Workspace settings documents        | `lib/api/workspace-settings.server.ts`                        |
| Diff parsing for local reviews      | `lib/api/diff.ts`                                             |
| TOTP / passkeys / API keys          | `lib/api/totp.ts`, `passkeys.server.ts`, `api-keys.server.ts` |
| Deployment and security             | `DEPLOY.md`, `SECURITY.md`, Docker/Compose                    |

`mock-data/` is no longer the persisted product database. It remains because UI
types, status/priority icons, deterministic seed fixtures, and unfinished demo
surfaces still depend on it. Do not add new persisted state there.

## Request flow

Authenticated API routes follow this pattern:

1. Call `requireContext`, `requireWrite`, or `requireAdmin`.
2. Parse writes with a Zod schema through `parseBody`.
3. Call a server-domain function with the context's `orgId` and `userId`.
4. Validate every referenced foreign key belongs to the same organization.
5. Return a DTO; pass caught failures through `errorResponse`.

Never trust the `[orgId]` pathname by itself, client-supplied roles, or an
unscoped database ID. `GUEST` and `APPLICATION` are read-only for content, with
explicit exceptions such as comments and personal notification actions.

## Authentication and onboarding

- Auth.js Credentials + bcrypt; sessions use JWTs.
- `sessionVersion` invalidates all prior sessions after a password change.
- Registration defaults to `SIGNUP_MODE=invite`.
- First-admin creation through the CLI, web form, and bootstrap API is serialized
  by the same PostgreSQL advisory transaction lock.
- New invitation links use opaque 256-bit random tokens and are claimed
  atomically before account creation.

Keep password hashing outside long database transactions when possible. Compare
operator secrets with `secretsEqual`; never add a plain string equality check for
`BOOTSTRAP_SECRET` or similar values.

## Client data lifecycle

`WorkspaceProvider` hydrates identity and reference stores first, then Issues,
then Notifications (which reference live Issue/User objects). Route-specific
stores hydrate without hiding an already-rendered workspace. Issues and Inbox
refresh in the background on a configurable interval and when the tab regains
focus.

Optimistic Issue writes use `createMutationGuard`. A background refresh must not
replace the cache while one of those writes is active. Preserve this invariant
when adding sync or realtime behavior.

The Issue cache is currently workspace-wide and client-filtered. Before serving
large workspaces, replace it with server-filtered cursor pagination and update
views to consume page/query caches; do not silently cap the existing endpoint,
because that would make older issues disappear from counts and filters.

## Attachments

Metadata is stored in PostgreSQL; bytes live under `UPLOAD_DIR`. Uploads are
streamed with file/workspace limits and downloads are forced as attachments.
Local disk is acceptable only for the supported single-instance deployment and
must be backed up together with PostgreSQL. Multi-instance deployment requires
an object-storage implementation of `lib/api/storage.ts` and malware scanning.

## Database and concurrency

Use a transaction for multi-row invariants. Existing examples:

- first account/workspace bootstrap — global advisory transaction lock;
- per-workspace Issue number/rank allocation — organization-keyed advisory lock;
- last-admin protection — organization-keyed lock;
- invitation redemption — conditional `updateMany` claim.

Avoid `count()`, followed later by an unrelated `create()`, when the count
controls permissions or uniqueness. Lock or encode the invariant in a database
constraint.

## Testing and completion criteria

Run before handing off a change:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm exec prettier --check .
pnpm test
pnpm build
```

`test/rbac.integration.test.ts` runs only when `TEST_DATABASE_URL` points to a
disposable, migrated PostgreSQL database. Add integration coverage for changes
to permissions, organization ownership, transactions, or invitation behavior.
Unit-only green output does not validate those paths.

For a new API mutation, test at least validation failure, unauthorized/forbidden
access, cross-organization IDs, success, and the relevant concurrent or retry
case. Browser-critical flows should eventually be covered by Playwright.

## Deployment rules

- Never seed a production database. The seed contains demo accounts/content.
- Keep `SIGNUP_MODE=invite` unless open registration is an explicit product
  decision with stronger account controls.
- Terminate TLS at a trusted proxy, replace untrusted forwarding headers, cap
  request bodies, and add shared/edge rate limiting.
- Run `pnpm backup`, copy results off-host, and prove `scripts/restore.sh` in a
  disposable deployment before launch.
- `/api/health` checks process + database readiness; operators still need alerting,
  disk monitoring, log collection, and preferably error tracking.
- Schedule `POST /api/jobs/cycle-burnup` daily with its independent
  `CRON_SECRET`; do not reuse the bootstrap or Auth.js secret.

See `DEPLOY.md` and `SECURITY.md` for the complete operator checklist.
