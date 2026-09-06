import 'server-only';
import { Prisma, Priority } from '@prisma/client';

import { db } from '@/lib/db';
import { LexoRank } from '@/lib/utils';
import { blocksToText, readBlocks, storeBlocks, textToBlocks } from './rich-text';
import {
   IssueDTO,
   IssueCreateBody,
   IssueUpdateBody,
   ListIssuesQuery,
   PRIORITY_ENUM_TO_KEY,
} from './types';

const PRIORITY_BY_KEY: Record<string, Priority> = {
   'no-priority': Priority.NO_PRIORITY,
   'urgent': Priority.URGENT,
   'high': Priority.HIGH,
   'medium': Priority.MEDIUM,
   'low': Priority.LOW,
};
const toPriority = (key?: string | null): Priority =>
   PRIORITY_BY_KEY[key ?? 'no-priority'] ?? Priority.NO_PRIORITY;

/**
 * Server-side data access + Prisma <-> DTO translation for issues.
 *
 * This is the only place that knows the DB shape. Route handlers stay thin:
 * parse → call one of these → `NextResponse.json`. Copy this file per entity.
 */

const issueInclude = { labels: { select: { labelId: true } } } satisfies Prisma.IssueInclude;
type IssueRow = Prisma.IssueGetPayload<{ include: typeof issueInclude }>;

/* ------------------------------- serialize -------------------------------- */

export function serializeIssue(row: IssueRow): IssueDTO {
   const description = blocksToText(readBlocks(row.description));

   return {
      id: row.id,
      identifier: row.identifier,
      title: row.title,
      description,
      statusId: row.stateId,
      priorityId: PRIORITY_ENUM_TO_KEY[row.priority] ?? 'no-priority',
      assigneeId: row.assigneeId,
      createdById: row.createdById,
      labelIds: row.labels.map((l) => l.labelId),
      projectId: row.projectId,
      cycleId: row.cycleId ?? '',
      parentId: row.parentId,
      rank: row.rank,
      dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
      createdAt: row.createdAt.toISOString(),
   };
}

/* --------------------------------- reads ---------------------------------- */

export async function listIssues(orgId: string, query: ListIssuesQuery = {}): Promise<IssueDTO[]> {
   const where: Prisma.IssueWhereInput = { orgId };

   if (query.cycleId === '') where.cycleId = null;
   else if (query.cycleId) where.cycleId = query.cycleId;
   if (query.projectId) where.projectId = query.projectId;
   if (query.assigneeId === 'unassigned') where.assigneeId = null;
   else if (query.assigneeId) where.assigneeId = query.assigneeId;
   if (query.statusId) where.stateId = query.statusId;
   if (query.q) {
      where.OR = [
         { title: { contains: query.q, mode: 'insensitive' } },
         { identifier: { contains: query.q, mode: 'insensitive' } },
      ];
   }

   const rows = await db.issue.findMany({
      where,
      include: issueInclude,
      orderBy: { rank: 'desc' },
   });
   return rows.map(serializeIssue);
}

export async function getIssue(orgId: string, id: string): Promise<IssueDTO | null> {
   const row = await db.issue.findFirst({
      where: { orgId, OR: [{ id }, { identifier: id }] },
      include: issueInclude,
   });
   return row ? serializeIssue(row) : null;
}

/* -------------------------------- writes ---------------------------------- */

/** create: only ever connect or omit */
const connectOrUndef = (id: string | null | undefined) => (id ? { connect: { id } } : undefined);

/** update: connect when set, disconnect when explicitly null, omit when undefined */
const relation = (id: string | null | undefined) =>
   id ? { connect: { id } } : id === null ? { disconnect: true as const } : undefined;

function labelWrite(labelIds: string[] | undefined): Prisma.IssueUpdateInput['labels'] {
   if (labelIds === undefined) return undefined;
   return {
      deleteMany: {},
      create: labelIds.map((labelId) => ({ label: { connect: { id: labelId } } })),
   };
}

export async function createIssue(
   orgId: string,
   body: IssueCreateBody,
   actorId: string | null
): Promise<IssueDTO> {
   return db.$transaction(async (tx) => {
      const org = await tx.organization.findUniqueOrThrow({ where: { id: orgId } });

      const last = await tx.issue.findFirst({
         where: { orgId },
         orderBy: { sequenceNumber: 'desc' },
         select: { sequenceNumber: true },
      });
      const sequenceNumber = (last?.sequenceNumber ?? 700) + 1;

      const top = await tx.issue.findFirst({
         where: { orgId },
         orderBy: { rank: 'desc' },
         select: { rank: true },
      });
      const rank = top
         ? LexoRank.from(top.rank).increment().toString()
         : new LexoRank('a3c').toString();

      // Team: issues aren't team-scoped in the UI — inherit from the project,
      // else the cycle, else the org's first team.
      let teamId: string | undefined;
      if (body.projectId) {
         teamId = (await tx.project.findUnique({ where: { id: body.projectId } }))?.teamId;
      }
      if (!teamId && body.cycleId) {
         teamId = (await tx.cycle.findUnique({ where: { id: body.cycleId } }))?.teamId;
      }
      if (!teamId) {
         teamId = (await tx.team.findFirst({ where: { orgId }, orderBy: { key: 'asc' } }))?.id;
      }
      if (!teamId) throw new Error('no team to attach the issue to');

      const created = await tx.issue.create({
         data: {
            org: { connect: { id: orgId } },
            team: { connect: { id: teamId } },
            sequenceNumber,
            identifier: `${org.issuePrefix}-${sequenceNumber}`,
            title: body.title?.trim() || 'Untitled',
            description: storeBlocks(textToBlocks(body.description ?? '')),
            state: { connect: { id: body.statusId ?? 'to-do' } },
            priority: toPriority(body.priorityId),
            assignee: connectOrUndef(body.assigneeId),
            creator: connectOrUndef(actorId),
            project: connectOrUndef(body.projectId),
            cycle: connectOrUndef(body.cycleId),
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            rank,
            activity: actorId
               ? { create: { actor: { connect: { id: actorId } }, verb: 'created' } }
               : undefined,
            labels: body.labelIds
               ? {
                    create: body.labelIds.map((labelId) => ({
                       label: { connect: { id: labelId } },
                    })),
                 }
               : undefined,
         },
         include: issueInclude,
      });
      return serializeIssue(created);
   });
}

export async function updateIssue(
   orgId: string,
   id: string,
   body: IssueUpdateBody
): Promise<IssueDTO | null> {
   const existing = await db.issue.findFirst({
      where: { orgId, OR: [{ id }, { identifier: id }] },
      select: { id: true, stateId: true },
   });
   if (!existing) return null;

   const data: Prisma.IssueUpdateInput = {};
   if (body.title !== undefined) data.title = body.title;
   if (body.description !== undefined) {
      data.description = storeBlocks(textToBlocks(body.description));
   }
   if (body.statusId !== undefined) data.state = { connect: { id: body.statusId } };
   if (body.priorityId !== undefined) data.priority = toPriority(body.priorityId);
   if (body.assigneeId !== undefined) data.assignee = relation(body.assigneeId);
   if (body.projectId !== undefined) data.project = relation(body.projectId);
   if (body.cycleId !== undefined) {
      data.cycle = body.cycleId ? { connect: { id: body.cycleId } } : { disconnect: true };
   }
   if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
   if (body.rank !== undefined) data.rank = body.rank;
   const labels = labelWrite(body.labelIds);
   if (labels) data.labels = labels;

   // keep completedAt in sync with the state's category
   if (body.statusId !== undefined && body.statusId !== existing.stateId) {
      const next = await db.workflowState.findUnique({ where: { id: body.statusId } });
      data.completedAt = next?.category === 'COMPLETED' ? new Date() : null;
   }

   const row = await db.issue.update({
      where: { id: existing.id },
      data,
      include: issueInclude,
   });
   return serializeIssue(row);
}

export async function deleteIssue(orgId: string, id: string): Promise<boolean> {
   const existing = await db.issue.findFirst({
      where: { orgId, OR: [{ id }, { identifier: id }] },
      select: { id: true },
   });
   if (!existing) return false;
   await db.issue.delete({ where: { id: existing.id } });
   return true;
}
