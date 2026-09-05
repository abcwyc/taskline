/**
 * Circle — database seed
 * ----------------------------------------------------------------------------
 * Transforms the existing `mock-data/*` modules into real rows so a fresh
 * install boots with the same fully-populated workspace the template ships.
 *
 * Run:
 *   npx prisma migrate reset      # drops + re-migrates + runs this seed
 *   npx prisma db seed            # seed only (expects an empty-ish DB)
 *
 * package.json:
 *   "prisma": { "seed": "tsx prisma/seed.ts" }
 *
 * The mock modules pull in React/JSX and icon packages; `tsx` (esbuild) handles
 * that fine — nothing is rendered, the components are only read for their names.
 * ----------------------------------------------------------------------------
 */

import {
   PrismaClient,
   Prisma,
   Priority as P,
   Health as H,
   StateCategory as SC,
   PresenceStatus as PS,
   Role as R,
   CycleStatus as CS,
   InitiativeStatus as IS,
   ReviewStatus as RS,
} from '@prisma/client';

import { status, workflowOrderedStatus, displayOrderedStatus } from '../mock-data/status';
import { labels as mockLabels } from '../mock-data/labels';
import { users as mockUsers } from '../mock-data/users';
import { teams as mockTeams } from '../mock-data/teams';
import { projects as mockProjects } from '../mock-data/projects';
import { getProjectDetail } from '../mock-data/project-details';
import { cycles as mockCycles } from '../mock-data/cycles';
import { issues as mockIssues } from '../mock-data/issues';
import { initiatives as mockInitiatives } from '../mock-data/initiatives';
import { views as mockViews } from '../mock-data/views';
import { documentFolders as mockFolders } from '../mock-data/documents';
import { inboxItems as mockInbox } from '../mock-data/inbox';
import { triageItems as mockTriage } from '../mock-data/triage';
import { reviews as mockReviews } from '../mock-data/reviews';

const db = new PrismaClient();

/* -------------------------------------------------------------------------- */
/*                                  Config                                    */
/* -------------------------------------------------------------------------- */

const ORG_ID = 'org_lndev';
const ORG_SLUG = 'lndev-ui'; // must match the `[orgId]` used in mock nav data
const ORG_PREFIX = 'LNUI';

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const PRIORITY: Record<string, P> = {
   'no-priority': P.NO_PRIORITY,
   'urgent': P.URGENT,
   'high': P.HIGH,
   'medium': P.MEDIUM,
   'low': P.LOW,
};

const HEALTH: Record<string, H> = {
   'no-update': H.NO_UPDATE,
   'off-track': H.OFF_TRACK,
   'on-track': H.ON_TRACK,
   'at-risk': H.AT_RISK,
};

const STATE_CATEGORY: Record<string, SC> = {
   triage: SC.TRIAGE,
   backlog: SC.BACKLOG,
   unstarted: SC.UNSTARTED,
   started: SC.STARTED,
   completed: SC.COMPLETED,
   canceled: SC.CANCELED,
};

const PRESENCE: Record<string, PS> = {
   online: PS.ONLINE,
   offline: PS.OFFLINE,
   away: PS.AWAY,
};

const ROLE: Record<string, R> = {
   Admin: R.ADMIN,
   Member: R.MEMBER,
   Guest: R.GUEST,
   Application: R.APPLICATION,
};

const CYCLE_STATUS: Record<string, CS> = {
   planned: CS.PLANNED,
   upcoming: CS.UPCOMING,
   current: CS.CURRENT,
   completed: CS.COMPLETED,
};

const INITIATIVE_STATUS: Record<string, IS> = {
   active: IS.ACTIVE,
   planned: IS.PLANNED,
   completed: IS.COMPLETED,
   canceled: IS.CANCELED,
};

const priority = (id: string | undefined) => PRIORITY[id ?? 'no-priority'] ?? P.NO_PRIORITY;
const health = (id: string | undefined) => HEALTH[id ?? 'no-update'] ?? H.NO_UPDATE;

const date = (s?: string | null): Date | null => (s ? new Date(s) : null);

/** "9h ago" / "2h" / "1d" / "55min ago" / "3d ago" → an approximate timestamp */
function agoToDate(s: string): Date {
   const now = Date.now();
   const m = s.match(/(\d+)\s*(min|h|d|w)/i);
   if (!m) return new Date(now);
   const n = Number(m[1]);
   const unit = m[2].toLowerCase();
   const ms =
      unit === 'min' ? 60_000 : unit === 'h' ? 3_600_000 : unit === 'd' ? 86_400_000 : 604_800_000;
   return new Date(now - n * ms);
}

/** lucide / remix icon component → its display name (mock passes the component) */
function iconName(icon: unknown): string {
   const c = icon as { displayName?: string; name?: string; render?: { displayName?: string } };
   return c?.displayName || c?.render?.displayName || c?.name || 'Box';
}

// PKs are kept identical to the mock-data ids so the frontend registries
// (`getProjectById('1')`, `status.find(s => s.id === 'in-progress')`, …) and the
// `[teamId]` routes keep resolving unchanged during the migration. Org-scoping
// still exists via the FK + `@@unique([orgId, key])`.
const teamKey = (mockTeamId: string) => mockTeamId; // "CORE"
const stateId = (statusId: string) => statusId; // "in-progress"
const labelId = (key: string) => key; // "bug"
const projectId = (mockId: string) => mockId; // "1"
const cycleId = (mockId: string) => mockId; // "21"
const issueId = (identifier: string) => identifier; // "LNUI-701"

async function safe(label: string, fn: () => Promise<unknown>) {
   try {
      await fn();
      console.log(`  ✓ ${label}`);
   } catch (err) {
      console.warn(`  ⚠ ${label} skipped:`, (err as Error).message);
   }
}

/* -------------------------------------------------------------------------- */
/*                                  Cleanup                                   */
/* -------------------------------------------------------------------------- */

async function reset() {
   // FK-safe order (children first). Cascades cover most, but be explicit.
   await db.$transaction([
      db.notification.deleteMany(),
      db.issueLabel.deleteMany(),
      db.issueRelation.deleteMany(),
      db.prLink.deleteMany(),
      db.issueComment.deleteMany(),
      db.issueActivity.deleteMany(),
      db.cycleBurnupPoint.deleteMany(),
      db.projectUpdate.deleteMany(),
      db.projectMilestone.deleteMany(),
      db.projectLabel.deleteMany(),
      db.projectDetail.deleteMany(),
      db.triageItem.deleteMany(),
      db.review.deleteMany(),
      db.savedView.deleteMany(),
      db.document.deleteMany(),
      db.documentFolder.deleteMany(),
      db.issue.deleteMany(),
      db.cycle.deleteMany(),
      db.project.deleteMany(),
      db.initiative.deleteMany(),
      db.label.deleteMany(),
      db.workflowState.deleteMany(),
      db.teamMembership.deleteMany(),
      db.team.deleteMany(),
      db.membership.deleteMany(),
      db.session.deleteMany(),
      db.account.deleteMany(),
      db.user.deleteMany(),
      db.organization.deleteMany(),
   ]);
}

/* -------------------------------------------------------------------------- */
/*                                   Seed                                     */
/* -------------------------------------------------------------------------- */

async function main() {
   console.log('› resetting');
   await reset();

   /* ---------------------------- organization ---------------------------- */
   await db.organization.create({
      data: { id: ORG_ID, slug: ORG_SLUG, name: 'LNDev UI', issuePrefix: ORG_PREFIX },
   });

   /* ------------------------------- users -------------------------------- */
   await db.user.createMany({
      data: mockUsers.map((u) => ({
         id: u.id,
         email: u.email,
         name: u.name,
         avatarUrl: u.avatarUrl,
         timezone: u.timezone,
         presence: PRESENCE[u.status] ?? PS.OFFLINE,
         createdAt: date(u.joinedDate) ?? new Date(),
      })),
   });

   await db.membership.createMany({
      data: mockUsers.map((u) => ({
         userId: u.id,
         orgId: ORG_ID,
         role: ROLE[u.role] ?? R.MEMBER,
         joinedAt: date(u.joinedDate) ?? new Date(),
      })),
   });
   console.log(`  ✓ ${mockUsers.length} users`);

   /* ------------------------------- teams -------------------------------- */
   // Collect every team key referenced anywhere; create missing ones as stubs.
   const referenced = new Set<string>();
   mockTeams.forEach((t) => referenced.add(t.id));
   mockUsers.forEach((u) => u.teamIds.forEach((k) => referenced.add(k)));
   mockProjects.forEach((p) => p.teamId && referenced.add(p.teamId));
   mockCycles.forEach((c) => referenced.add(c.teamId));
   mockViews.forEach((v) => v.teamId && referenced.add(v.teamId));
   mockTriage.forEach((t) => referenced.add(t.teamId));
   mockInitiatives.forEach((i) => i.leadTeamId && referenced.add(i.leadTeamId));

   const known = new Map(mockTeams.map((t) => [t.id, t]));
   await db.team.createMany({
      data: [...referenced].map((key) => {
         const t = known.get(key);
         return {
            id: teamKey(key),
            orgId: ORG_ID,
            key,
            name: t?.name ?? key,
            icon: t?.icon ?? '📁',
            color: t?.color ?? '#95a2b3',
            joined: t?.joined ?? false,
         };
      }),
   });

   const teamMembers = new Set<string>();
   const tmRows: { userId: string; teamId: string }[] = [];
   mockUsers.forEach((u) =>
      u.teamIds.forEach((k) => {
         const pair = `${u.id}:${k}`;
         if (referenced.has(k) && !teamMembers.has(pair)) {
            teamMembers.add(pair);
            tmRows.push({ userId: u.id, teamId: teamKey(k) });
         }
      })
   );
   mockTeams.forEach((t) =>
      t.members.forEach((m) => {
         const pair = `${m.id}:${t.id}`;
         if (!teamMembers.has(pair)) {
            teamMembers.add(pair);
            tmRows.push({ userId: m.id, teamId: teamKey(t.id) });
         }
      })
   );
   await db.teamMembership.createMany({ data: tmRows, skipDuplicates: true });
   console.log(`  ✓ ${referenced.size} teams, ${tmRows.length} memberships`);

   /* -------------------------- workflow states --------------------------- */
   const wfOrder = new Map(workflowOrderedStatus.map((s, i) => [s.id, i]));
   const dispOrder = new Map(displayOrderedStatus.map((s, i) => [s.id, i]));
   await db.workflowState.createMany({
      data: status.map((s) => ({
         id: stateId(s.id),
         orgId: ORG_ID,
         key: s.id,
         name: s.name,
         color: s.color,
         category: STATE_CATEGORY[s.category],
         iconKey: s.id, // frontend maps statusId → icon component
         workflowOrder: wfOrder.get(s.id) ?? 0,
         displayOrder: dispOrder.get(s.id) ?? 0,
      })),
   });
   console.log(`  ✓ ${status.length} workflow states`);

   /* ------------------------------ labels -------------------------------- */
   await db.label.createMany({
      data: mockLabels.map((l) => ({
         id: labelId(l.id),
         orgId: ORG_ID,
         key: l.id,
         name: l.name,
         color: l.color,
      })),
   });
   console.log(`  ✓ ${mockLabels.length} labels`);

   /* ---------------------------- initiatives ----------------------------- */
   const validUser = new Set(mockUsers.map((u) => u.id));
   await db.initiative.createMany({
      data: mockInitiatives.map((i) => ({
         id: i.id,
         orgId: ORG_ID,
         name: i.name,
         description: i.description ?? null,
         icon: i.icon,
         status: INITIATIVE_STATUS[i.status] ?? IS.ACTIVE,
         priority: priority(i.priority?.id),
         ownerId: i.owner && validUser.has(i.owner.id) ? i.owner.id : null,
         leadTeamId: i.leadTeamId && referenced.has(i.leadTeamId) ? teamKey(i.leadTeamId) : null,
         target: i.target ?? null,
         health: health(i.health?.id),
         createdAt: date(i.createdAt) ?? new Date(),
      })),
   });

   // invert initiative.projectIds → project.initiativeId
   const projectInitiative = new Map<string, string>();
   mockInitiatives.forEach((i) => i.projectIds.forEach((pid) => projectInitiative.set(pid, i.id)));
   console.log(`  ✓ ${mockInitiatives.length} initiatives`);

   /* ----------------------------- projects ------------------------------- */
   const validProject = new Set(mockProjects.map((p) => p.id));
   await db.project.createMany({
      data: mockProjects.map((p) => ({
         id: projectId(p.id),
         orgId: ORG_ID,
         teamId: teamKey(p.teamId),
         name: p.name,
         icon: iconName(p.icon),
         stateId: stateId(p.status.id),
         priority: priority(p.priority?.id),
         health: health(p.health?.id),
         healthUpdatedAt:
            p.healthUpdatedAgoDays != null
               ? new Date(Date.now() - p.healthUpdatedAgoDays * 86_400_000)
               : null,
         startDate: date(p.startDate),
         targetDate: date(p.targetDate),
         leadId: p.lead && validUser.has(p.lead.id) ? p.lead.id : null,
         initiativeId: projectInitiative.get(p.id) ?? null,
      })),
   });

   const projectLabelRows: { projectId: string; labelId: string }[] = [];
   mockProjects.forEach((p) =>
      (p.labels ?? []).forEach((l) => {
         projectLabelRows.push({ projectId: projectId(p.id), labelId: labelId(l.id) });
      })
   );
   await db.projectLabel.createMany({ data: projectLabelRows, skipDuplicates: true });
   console.log(`  ✓ ${mockProjects.length} projects`);

   /* -------------------------- project details --------------------------- */
   const PU_HEALTH: Record<string, 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK'> = {
      'on-track': 'ON_TRACK',
      'at-risk': 'AT_RISK',
      'off-track': 'OFF_TRACK',
   };
   let milestoneCount = 0;
   let updateCount = 0;
   await safe('project details', async () => {
      for (const p of mockProjects) {
         const d = getProjectDetail(p.id);
         await db.projectDetail.create({
            data: {
               projectId: projectId(p.id),
               summary: d.summary,
               description: d.description as unknown as Prisma.InputJsonValue,
               resources: d.resources as unknown as Prisma.InputJsonValue,
               activity: d.activity.map((a) => ({
                  id: a.id,
                  userId: validUser.has(a.user.id) ? a.user.id : mockUsers[0].id,
                  date: a.date,
                  text: a.text,
               })) as unknown as Prisma.InputJsonValue,
            },
         });
         if (d.milestones.length) {
            await db.projectMilestone.createMany({
               data: d.milestones.map((m, i) => ({
                  id: `${p.id}-m${i + 1}`,
                  projectId: projectId(p.id),
                  name: m.name,
                  targetDate: m.targetDate ? new Date(m.targetDate) : null,
                  completed: m.completed,
                  order: i,
               })),
            });
            milestoneCount += d.milestones.length;
         }
         for (const u of d.updates) {
            await db.projectUpdate.create({
               data: {
                  projectId: projectId(p.id),
                  authorId: validUser.has(u.author.id) ? u.author.id : mockUsers[0].id,
                  health: PU_HEALTH[u.health] ?? 'ON_TRACK',
                  blocks: u.blocks as unknown as Prisma.InputJsonValue,
                  createdAt: new Date(u.date),
               },
            });
            updateCount += 1;
         }
      }
   });
   console.log(`  ✓ project details (${milestoneCount} milestones, ${updateCount} updates)`);

   /* ------------------------------ cycles -------------------------------- */
   await db.cycle.createMany({
      data: mockCycles.map((c) => ({
         id: cycleId(c.id),
         teamId: teamKey(c.teamId),
         number: c.number,
         name: c.name,
         status: CYCLE_STATUS[c.status] ?? CS.PLANNED,
         startDate: new Date(c.startDate),
         endDate: new Date(c.endDate),
         capacity: c.capacity ?? 0,
      })),
   });

   const burnupRows: Prisma.CycleBurnupPointCreateManyInput[] = [];
   mockCycles.forEach((c) =>
      (c.burnup ?? []).forEach((pt) => {
         burnupRows.push({
            cycleId: cycleId(c.id),
            date: new Date(pt.date),
            scope: pt.scope,
            started: pt.started,
            completed: pt.completed,
            ideal: pt.ideal,
         });
      })
   );
   await db.cycleBurnupPoint.createMany({ data: burnupRows, skipDuplicates: true });
   console.log(`  ✓ ${mockCycles.length} cycles, ${burnupRows.length} burnup points`);

   /* ------------------------------ issues -------------------------------- */
   const validCycle = new Set(mockCycles.map((c) => c.id));
   const seqOf = (identifier: string) => Number(identifier.match(/-(\d+)$/)?.[1] ?? 0);
   const completedStates = new Set(
      status.filter((s) => s.category === 'completed').map((s) => s.id)
   );

   await db.issue.createMany({
      data: mockIssues.map((it) => ({
         id: issueId(it.identifier),
         orgId: ORG_ID,
         teamId: teamKey(
            // issues aren't team-scoped in the mock — attach to the project's team,
            // else the current cycle's team, else CORE.
            it.project?.teamId ?? mockCycles.find((c) => c.id === it.cycleId)?.teamId ?? 'CORE'
         ),
         sequenceNumber: seqOf(it.identifier),
         identifier: it.identifier,
         title: it.title,
         description: (it.description
            ? { type: 'doc', text: it.description }
            : {}) as Prisma.InputJsonValue,
         stateId: stateId(it.status.id),
         priority: priority(it.priority?.id),
         assigneeId: it.assignee && validUser.has(it.assignee.id) ? it.assignee.id : null,
         cycleId: it.cycleId && validCycle.has(it.cycleId) ? cycleId(it.cycleId) : null,
         projectId: it.project && validProject.has(it.project.id) ? projectId(it.project.id) : null,
         rank: it.rank,
         dueDate: date(it.dueDate),
         completedAt: completedStates.has(it.status.id) ? (date(it.createdAt) ?? new Date()) : null,
         createdAt: date(it.createdAt) ?? new Date(),
      })),
   });

   const validLabel = new Set(mockLabels.map((l) => l.id));
   const issueLabelRows: { issueId: string; labelId: string }[] = [];
   mockIssues.forEach((it) =>
      (it.labels ?? []).forEach((l) => {
         if (validLabel.has(l.id)) {
            issueLabelRows.push({ issueId: issueId(it.identifier), labelId: labelId(l.id) });
         }
      })
   );
   await db.issueLabel.createMany({ data: issueLabelRows, skipDuplicates: true });
   console.log(`  ✓ ${mockIssues.length} issues, ${issueLabelRows.length} label links`);

   const issueExists = new Set(mockIssues.map((i) => i.identifier));

   /* --------------------------- saved views ----------------------------- */
   await safe(`${mockViews.length} saved views`, () =>
      db.savedView.createMany({
         data: mockViews.map((v) => ({
            id: v.id,
            orgId: ORG_ID,
            teamId: v.teamId && referenced.has(v.teamId) ? teamKey(v.teamId) : null,
            ownerId: validUser.has(v.owner.id) ? v.owner.id : mockUsers[0].id,
            name: v.name,
            description: v.description,
            icon: v.icon,
            type: v.type === 'project' ? 'PROJECT' : 'ISSUE',
            filter: v.filter as Prisma.InputJsonValue,
            createdAt: date(v.createdAt) ?? new Date(),
            updatedAt: date(v.updatedAt) ?? new Date(),
         })),
      })
   );

   /* ---------------------------- documents ------------------------------ */
   await safe('document folders', async () => {
      for (const [idx, f] of mockFolders.entries()) {
         await db.documentFolder.create({
            data: {
               id: f.id,
               orgId: ORG_ID,
               name: f.name,
               icon: f.icon,
               order: idx,
               documents: {
                  create: f.documents.map((d) => ({
                     id: d.id,
                     name: d.name,
                     icon: d.icon,
                     pinned: d.pinned ?? false,
                     creatorId: validUser.has(d.creator.id) ? d.creator.id : mockUsers[0].id,
                     createdAt: date(d.createdAt) ?? new Date(),
                     updatedAt: date(d.updatedAt) ?? new Date(),
                  })),
               },
            },
         });
      }
   });

   /* --------------------------- notifications --------------------------- */
   const recipient = mockUsers.find((u) => u.role === 'Admin')?.id ?? mockUsers[0].id;
   await safe(`${mockInbox.length} notifications`, () =>
      db.notification.createMany({
         data: mockInbox.map((n) => ({
            userId: recipient,
            actorId: validUser.has(n.user.id) ? n.user.id : null,
            issueId: issueExists.has(n.identifier) ? issueId(n.identifier) : null,
            type: n.type,
            content: n.content,
            readAt: n.read ? agoToDate(n.timestamp) : null,
            createdAt: agoToDate(n.timestamp),
         })),
      })
   );

   /* ------------------------------ triage ------------------------------- */
   await safe(`${mockTriage.length} triage items`, () =>
      db.triageItem.createMany({
         data: mockTriage.map((t) => {
            const intel = t.intelligence ?? {};
            return {
               orgId: ORG_ID,
               teamId: teamKey(t.teamId),
               identifier: t.identifier,
               title: t.title,
               reporterKind: t.reporter.kind,
               reporterUserId:
                  t.reporter.kind === 'user' && validUser.has(t.reporter.user.id)
                     ? t.reporter.user.id
                     : null,
               reporterName: t.reporter.kind === 'integration' ? t.reporter.name : null,
               receivedAt: agoToDate(t.receivedAgo),
               sections: (t.sections ?? []) as unknown as Prisma.InputJsonValue,
               intelligence: {
                  suggestedAssigneeId: intel.suggestedAssignee?.id ?? null,
                  suggestedProjectId: intel.suggestedProject?.id ?? null,
                  suggestedLabelKeys: (intel.suggestedLabels ?? []).map((l) => l.id),
                  related: (intel.related ?? []).map((r) => ({
                     identifier: r.identifier,
                     title: r.title,
                     statusKey: r.status.id,
                  })),
               } as Prisma.InputJsonValue,
               preview: (t.preview ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
            };
         }),
      })
   );

   /* ------------------------------ reviews ------------------------------ */
   await safe(`${mockReviews.length} reviews`, () =>
      db.review.createMany({
         data: mockReviews.map((r) => ({
            orgId: ORG_ID,
            title: r.title,
            status: { open: RS.OPEN, merged: RS.MERGED, closed: RS.CLOSED }[r.status] ?? RS.OPEN,
            list: r.list === 'for-you' ? 'FOR_YOU' : 'CREATED',
            repo: r.repo,
            prNumber: r.prNumber,
            targetBranch: r.targetBranch,
            sourceBranch: r.sourceBranch,
            additions: r.additions,
            deletions: r.deletions,
            checksPassed: r.checksPassed,
            checksTotal: r.checksTotal,
            resolvesIdentifier: r.resolves?.identifier ?? null,
            data: {
               timeAgo: r.timeAgo,
               resolvesTitle: r.resolves?.title,
               files: r.files,
               commits: r.commits,
               summary: r.summary,
               testPlan: r.testPlan,
               deployment: r.deployment ?? null,
               reviewNote: r.reviewNote ?? null,
            } as unknown as Prisma.InputJsonValue,
         })),
      })
   );

   console.log('\n✅ seed complete');
}

main()
   .catch((e) => {
      console.error(e);
      process.exit(1);
   })
   .finally(() => db.$disconnect());
