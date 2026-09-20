import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';

import { db } from '@/lib/db';
import { sendNotificationEmails } from './email';

/**
 * Issue activity log + inbox notifications.
 *
 * Every mutation route calls into here so that (a) `IssueActivity` gets an audit
 * row and (b) the people watching the issue get a `Notification`. "Watching" =
 * explicit subscribers ∪ creator ∪ current assignee ∪ past commenters, minus the
 * actor. Acting on an issue (commenting, editing, being assigned) auto-subscribes
 * you.
 */

type Db = PrismaClient | Prisma.TransactionClient;

/* ------------------------------ subscriptions ----------------------------- */

export async function subscribeToIssue(client: Db, issueId: string, userId: string): Promise<void> {
   await client.issueSubscriber.upsert({
      where: { issueId_userId: { issueId, userId } },
      create: { issueId, userId },
      update: {},
   });
}

export async function unsubscribeFromIssue(
   client: Db,
   issueId: string,
   userId: string
): Promise<void> {
   await client.issueSubscriber.deleteMany({ where: { issueId, userId } });
}

export async function isSubscribed(issueId: string, userId: string): Promise<boolean> {
   const row = await db.issueSubscriber.findUnique({
      where: { issueId_userId: { issueId, userId } },
      select: { issueId: true },
   });
   return Boolean(row);
}

/** Everyone who should hear about a change to this issue, minus `exclude`. */
async function recipients(client: Db, issueId: string, exclude: string | null): Promise<string[]> {
   const [issue, subs, comments] = await Promise.all([
      client.issue.findUnique({
         where: { id: issueId },
         select: { createdById: true, assigneeId: true },
      }),
      client.issueSubscriber.findMany({ where: { issueId }, select: { userId: true } }),
      client.issueComment.findMany({
         where: { issueId },
         select: { authorId: true },
         distinct: ['authorId'],
      }),
   ]);
   const ids = new Set<string>();
   if (issue?.createdById) ids.add(issue.createdById);
   if (issue?.assigneeId) ids.add(issue.assigneeId);
   for (const s of subs) ids.add(s.userId);
   for (const c of comments) ids.add(c.authorId);
   if (exclude) ids.delete(exclude);
   return [...ids];
}

async function notify(
   client: Db,
   opts: {
      issueId: string;
      actorId: string | null;
      type: string;
      content: string;
      to: string[];
   }
): Promise<void> {
   if (opts.to.length === 0) return;
   const to = await filterByPreferences(client, opts.to, opts.type);
   if (to.length === 0) return;
   await client.notification.createMany({
      data: to.map((userId) => ({
         userId,
         actorId: opts.actorId,
         issueId: opts.issueId,
         type: opts.type,
         content: opts.content,
      })),
   });
   void sendNotificationEmails(to, `Taskline: ${opts.type}`, opts.content);
}

/** Map a notification type to the preference that gates it (null = always). */
const PREF_BY_TYPE: Record<string, keyof import('./preferences').Preferences | null> = {
   comment: 'notifyComments',
   edited: 'notifyComments',
   created: 'notifyComments',
   upload: 'notifyComments',
   mention: 'notifyMentions',
   assignment: 'notifyAssignments',
   status: 'notifyStatusChanges',
   reopened: 'notifyStatusChanges',
   closed: 'notifyStatusChanges',
};

async function filterByPreferences(client: Db, to: string[], type: string): Promise<string[]> {
   const prefKey = PREF_BY_TYPE[type] ?? null;
   if (!prefKey) return to;
   const users = await client.user.findMany({
      where: { id: { in: to } },
      select: { id: true, preferences: true },
   });
   const byId = new Map(users.map((u) => [u.id, u.preferences]));
   return to.filter((id) => {
      const raw = byId.get(id);
      if (!raw || typeof raw !== 'object') return true; // defaults are all-on
      const value = (raw as Record<string, unknown>)[prefKey];
      return typeof value === 'boolean' ? value : true;
   });
}

/* -------------------------------- comments ------------------------------- */

export async function onIssueCommented(
   client: Db,
   opts: { issueId: string; actorId: string; preview: string }
): Promise<void> {
   // No IssueActivity row — the comment itself is the timeline entry.
   await subscribeToIssue(client, opts.issueId, opts.actorId);
   const to = await recipients(client, opts.issueId, opts.actorId);
   const mentions = detectMentions(opts.preview);
   await notify(client, {
      issueId: opts.issueId,
      actorId: opts.actorId,
      type: 'comment',
      content: `commented: "${truncate(opts.preview, 80)}"`,
      to,
   });
   if (mentions.length) {
      const mentioned = await client.user.findMany({
         where: { email: { in: mentions } },
         select: { id: true },
      });
      await notify(client, {
         issueId: opts.issueId,
         actorId: opts.actorId,
         type: 'mention',
         content: `mentioned you in a comment`,
         to: mentioned.map((m) => m.id).filter((id) => id !== opts.actorId),
      });
   }
}

const detectMentions = (text: string): string[] =>
   [...text.matchAll(/@([\w.+-]+@[\w.-]+\.\w+)/g)].map((m) => m[1].toLowerCase());
const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/* --------------------------------- updates ------------------------------- */

/** The pre-update issue, in the same key-space as `IssueUpdateBody` (a serialized DTO works). */
export interface IssueBefore {
   statusId: string;
   priorityId: string;
   assigneeId: string | null;
   projectId: string | null;
   title: string;
   dueDate: string | null; // ISO date or null
   estimate: number | null;
   labelIds: string[];
}

interface IssueUpdatePatch {
   statusId?: string;
   priorityId?: string;
   assigneeId?: string | null;
   projectId?: string | null;
   title?: string;
   description?: string;
   dueDate?: string | null;
   estimate?: number | null;
   labelIds?: string[];
}

/** Record activity + notifications for a set of field changes. Call after the update. */
export async function onIssueUpdated(
   client: Db,
   opts: {
      issueId: string;
      orgId: string;
      actorId: string | null;
      before: IssueBefore;
      patch: IssueUpdatePatch;
   }
): Promise<void> {
   const { issueId, actorId, before, patch } = opts;
   const activity: Prisma.IssueActivityCreateManyInput[] = [];
   const notes: { type: string; content: string; extraTo?: string[] }[] = [];

   const act = (field: string, oldValue: string | null, newValue: string | null) => {
      if (actorId) activity.push({ issueId, actorId, field, oldValue, newValue, verb: 'updated' });
   };

   // status
   if (patch.statusId !== undefined && patch.statusId !== before.statusId) {
      const [from, to] = await Promise.all([
         client.workflowState.findFirst({
            where: { OR: [{ id: before.statusId }, { key: before.statusId }] },
            select: { name: true, category: true },
         }),
         client.workflowState.findFirst({
            where: { OR: [{ id: patch.statusId }, { key: patch.statusId }] },
            select: { name: true, category: true },
         }),
      ]);
      act('status', from?.name ?? before.statusId, to?.name ?? patch.statusId);
      const type =
         to?.category === 'COMPLETED'
            ? 'closed'
            : from?.category === 'COMPLETED'
              ? 'reopened'
              : 'status';
      notes.push({ type, content: `changed status to ${to?.name ?? patch.statusId}` });
   }

   // assignee
   if (patch.assigneeId !== undefined && patch.assigneeId !== before.assigneeId) {
      const names = await namesFor(client, [patch.assigneeId, before.assigneeId]);
      act(
         'assignee',
         names[before.assigneeId ?? ''] ?? null,
         names[patch.assigneeId ?? ''] ?? null
      );
      // the person losing the issue should hear about it too, even though they're
      // no longer in `recipients()` after the update
      const extraTo = [patch.assigneeId, before.assigneeId].filter((x): x is string => Boolean(x));
      if (patch.assigneeId) {
         await subscribeToIssue(client, issueId, patch.assigneeId);
         notes.push({
            type: 'assignment',
            content: `assigned this issue to ${names[patch.assigneeId] ?? 'someone'}`,
            extraTo,
         });
      } else {
         notes.push({ type: 'assignment', content: `unassigned this issue`, extraTo });
      }
   }

   // priority
   if (patch.priorityId !== undefined && patch.priorityId !== before.priorityId) {
      act('priority', before.priorityId, patch.priorityId);
      notes.push({
         type: 'edited',
         content: `set priority to ${patch.priorityId.replace(/-/g, ' ')}`,
      });
   }

   // project
   if (patch.projectId !== undefined && patch.projectId !== before.projectId) {
      const proj = patch.projectId
         ? await client.project.findUnique({
              where: { id: patch.projectId },
              select: { name: true },
           })
         : null;
      act('project', before.projectId, patch.projectId);
      notes.push({
         type: 'edited',
         content: proj ? `moved this issue to ${proj.name}` : `removed this issue from its project`,
      });
   }

   // title
   if (patch.title !== undefined && patch.title.trim() && patch.title !== before.title) {
      act('title', before.title, patch.title);
      notes.push({
         type: 'edited',
         content: `renamed this issue to "${truncate(patch.title, 60)}"`,
      });
   }

   // description (activity only)
   if (patch.description !== undefined) {
      act('description', null, null);
   }

   // due date
   if (patch.dueDate !== undefined && (patch.dueDate ?? null) !== (before.dueDate ?? null)) {
      act('dueDate', before.dueDate, patch.dueDate ?? null);
      notes.push({
         type: 'edited',
         content: patch.dueDate ? `set the due date to ${patch.dueDate}` : `cleared the due date`,
      });
   }

   // estimate
   if (patch.estimate !== undefined && (patch.estimate ?? null) !== (before.estimate ?? null)) {
      const next = patch.estimate ?? null;
      act(
         'estimate',
         before.estimate !== null ? String(before.estimate) : null,
         next !== null ? String(next) : null
      );
      notes.push({
         type: 'edited',
         content:
            patch.estimate !== null && patch.estimate !== undefined
               ? `set the estimate to ${patch.estimate}`
               : `cleared the estimate`,
      });
   }

   // labels (activity only — noisy as a notification)
   if (patch.labelIds !== undefined) {
      const beforeSet = new Set(before.labelIds);
      const afterSet = new Set(patch.labelIds);
      const added = patch.labelIds.filter((l) => !beforeSet.has(l));
      const removed = before.labelIds.filter((l) => !afterSet.has(l));
      if (added.length || removed.length) {
         act('label', removed.join(',') || null, added.join(',') || null);
      }
   }

   if (activity.length) {
      // actorId is required on IssueActivity; skip the audit row for system edits
      await client.issueActivity.createMany({
         data: activity.filter((a) => a.actorId),
      });
   }

   if (notes.length && actorId) {
      await subscribeToIssue(client, issueId, actorId);
      const base = await recipients(client, issueId, actorId);
      for (const n of notes) {
         const to = [...new Set([...base, ...(n.extraTo ?? [])])].filter((id) => id !== actorId);
         await notify(client, { issueId, actorId, type: n.type, content: n.content, to });
      }
   }
}

async function namesFor(client: Db, ids: (string | null)[]): Promise<Record<string, string>> {
   const real = [...new Set(ids.filter((x): x is string => Boolean(x)))];
   if (!real.length) return {};
   const users = await client.user.findMany({
      where: { id: { in: real } },
      select: { id: true, name: true },
   });
   return Object.fromEntries(users.map((u) => [u.id, u.name]));
}
