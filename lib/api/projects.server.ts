import 'server-only';
import { PublicError } from './http';
import { Health, Prisma, Priority } from '@prisma/client';

import { db } from '@/lib/db';
import { assertOrgScope } from './ownership.server';
import {
   HEALTH_ENUM_TO_KEY,
   HEALTH_KEY_TO_ENUM,
   ListProjectsQuery,
   PRIORITY_ENUM_TO_KEY,
   ProjectCreateBody,
   ProjectDTO,
   ProjectUpdateBody,
} from './types';

/**
 * Server-side data access + Prisma <-> DTO translation for projects.
 * Mirrors `issues.server.ts` — see that file for the pattern.
 */

const projectInclude = { labels: { select: { labelId: true } } } satisfies Prisma.ProjectInclude;
type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

const PRIORITY_BY_KEY: Record<string, Priority> = {
   'no-priority': Priority.NO_PRIORITY,
   'urgent': Priority.URGENT,
   'high': Priority.HIGH,
   'medium': Priority.MEDIUM,
   'low': Priority.LOW,
};
const toPriority = (key?: string | null): Priority =>
   PRIORITY_BY_KEY[key ?? 'no-priority'] ?? Priority.NO_PRIORITY;

const HEALTH_BY_KEY: Record<string, Health> = {
   'no-update': Health.NO_UPDATE,
   'off-track': Health.OFF_TRACK,
   'on-track': Health.ON_TRACK,
   'at-risk': Health.AT_RISK,
};
const toHealth = (key?: string | null): Health =>
   HEALTH_BY_KEY[key ?? 'no-update'] ?? Health.NO_UPDATE;

/* ---------------------------- derived: progress -------------------------- */

/** completed issues / total issues, per project, in one pair of grouped queries */
async function percentCompleteByProject(
   orgId: string,
   projectIds: string[]
): Promise<Map<string, number>> {
   const out = new Map<string, number>();
   if (projectIds.length === 0) return out;

   const [totals, done] = await Promise.all([
      db.issue.groupBy({
         by: ['projectId'],
         where: { orgId, projectId: { in: projectIds } },
         _count: { _all: true },
      }),
      db.issue.groupBy({
         by: ['projectId'],
         where: { orgId, projectId: { in: projectIds }, state: { category: 'COMPLETED' } },
         _count: { _all: true },
      }),
   ]);

   const doneMap = new Map(done.map((d) => [d.projectId, d._count._all]));
   for (const t of totals) {
      if (!t.projectId) continue;
      const total = t._count._all;
      const completed = doneMap.get(t.projectId) ?? 0;
      out.set(t.projectId, total > 0 ? Math.round((completed / total) * 100) : 0);
   }
   return out;
}

/* ------------------------------- serialize ------------------------------- */

export function serializeProject(row: ProjectRow, percentComplete = 0): ProjectDTO {
   const healthAgeDays = row.healthUpdatedAt
      ? Math.max(0, Math.round((Date.now() - row.healthUpdatedAt.getTime()) / 86_400_000))
      : null;

   return {
      id: row.id,
      name: row.name,
      iconKey: row.icon,
      statusId: row.stateId,
      priorityId: PRIORITY_ENUM_TO_KEY[row.priority] ?? 'no-priority',
      healthId: HEALTH_ENUM_TO_KEY[row.health] ?? 'no-update',
      leadId: row.leadId,
      initiativeId: row.initiativeId,
      teamId: row.teamId,
      labelIds: row.labels.map((l) => l.labelId),
      startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : '',
      targetDate: row.targetDate ? row.targetDate.toISOString().slice(0, 10) : null,
      healthUpdatedAgoDays: healthAgeDays,
      percentComplete,
      createdAt: row.createdAt.toISOString(),
   };
}

/* --------------------------------- reads -------------------------------- */

export async function listProjects(
   orgId: string,
   query: ListProjectsQuery = {}
): Promise<ProjectDTO[]> {
   const where: Prisma.ProjectWhereInput = { orgId };
   if (query.teamId) where.teamId = query.teamId;
   if (query.initiativeId) where.initiativeId = query.initiativeId;
   if (query.leadId) where.leadId = query.leadId;
   if (query.statusId) where.stateId = query.statusId;
   if (query.healthId) where.health = toHealth(query.healthId);
   if (query.q) where.name = { contains: query.q, mode: 'insensitive' };

   const rows = await db.project.findMany({
      where,
      include: projectInclude,
      orderBy: { startDate: 'asc' },
   });
   const progress = await percentCompleteByProject(
      orgId,
      rows.map((r) => r.id)
   );
   return rows.map((r) => serializeProject(r, progress.get(r.id) ?? 0));
}

export async function getProject(orgId: string, id: string): Promise<ProjectDTO | null> {
   const row = await db.project.findFirst({ where: { orgId, id }, include: projectInclude });
   if (!row) return null;
   const progress = await percentCompleteByProject(orgId, [row.id]);
   return serializeProject(row, progress.get(row.id) ?? 0);
}

/* -------------------------------- writes -------------------------------- */

const connectOrUndef = (id: string | null | undefined) => (id ? { connect: { id } } : undefined);
const relation = (id: string | null | undefined) =>
   id ? { connect: { id } } : id === null ? { disconnect: true as const } : undefined;

export async function createProject(orgId: string, body: ProjectCreateBody): Promise<ProjectDTO> {
   await assertOrgScope(db, orgId, {
      teamId: body.teamId,
      statusId: body.statusId,
      leadId: body.leadId ?? undefined,
      initiativeId: body.initiativeId ?? undefined,
      labelIds: body.labelIds,
   });

   let teamId = body.teamId;
   if (!teamId) {
      teamId = (await db.team.findFirst({ where: { orgId }, orderBy: { key: 'asc' } }))?.id;
   }
   if (!teamId) throw new PublicError('no team to attach the project to');

   const row = await db.project.create({
      data: {
         org: { connect: { id: orgId } },
         team: { connect: { id: teamId } },
         name: body.name?.trim() || 'New project',
         icon: body.iconKey ?? 'Box',
         state: { connect: { id: body.statusId ?? 'to-do' } },
         priority: toPriority(body.priorityId),
         health: toHealth(body.healthId),
         healthUpdatedAt: body.healthId && body.healthId !== 'no-update' ? new Date() : null,
         startDate: body.startDate ? new Date(body.startDate) : new Date(),
         targetDate: body.targetDate ? new Date(body.targetDate) : null,
         lead: connectOrUndef(body.leadId),
         initiative: connectOrUndef(body.initiativeId),
         labels: body.labelIds
            ? { create: body.labelIds.map((labelId) => ({ label: { connect: { id: labelId } } })) }
            : undefined,
      },
      include: projectInclude,
   });
   return serializeProject(row, 0);
}

export async function updateProject(
   orgId: string,
   id: string,
   body: ProjectUpdateBody
): Promise<ProjectDTO | null> {
   const existing = await db.project.findFirst({
      where: { orgId, id },
      select: { id: true, health: true },
   });
   if (!existing) return null;

   await assertOrgScope(db, orgId, {
      ...('teamId' in body ? { teamId: body.teamId } : {}),
      ...('statusId' in body ? { statusId: body.statusId } : {}),
      ...('leadId' in body ? { leadId: body.leadId } : {}),
      ...('initiativeId' in body ? { initiativeId: body.initiativeId } : {}),
      ...('labelIds' in body ? { labelIds: body.labelIds } : {}),
   });

   const data: Prisma.ProjectUpdateInput = {};
   if (body.name !== undefined) data.name = body.name;
   if (body.iconKey !== undefined) data.icon = body.iconKey;
   if (body.statusId !== undefined) data.state = { connect: { id: body.statusId } };
   if (body.priorityId !== undefined) data.priority = toPriority(body.priorityId);
   if (body.healthId !== undefined) {
      data.health = toHealth(body.healthId);
      data.healthUpdatedAt =
         HEALTH_KEY_TO_ENUM[body.healthId] === existing.health ? undefined : new Date();
   }
   if (body.leadId !== undefined) data.lead = relation(body.leadId);
   if (body.initiativeId !== undefined) data.initiative = relation(body.initiativeId);
   if (body.teamId !== undefined && body.teamId) data.team = { connect: { id: body.teamId } };
   if (body.startDate !== undefined)
      data.startDate = body.startDate ? new Date(body.startDate) : null;
   if (body.targetDate !== undefined)
      data.targetDate = body.targetDate ? new Date(body.targetDate) : null;
   if (body.labelIds !== undefined) {
      data.labels = {
         deleteMany: {},
         create: body.labelIds.map((labelId) => ({ label: { connect: { id: labelId } } })),
      };
   }

   const row = await db.project.update({
      where: { id: existing.id },
      data,
      include: projectInclude,
   });
   const progress = await percentCompleteByProject(orgId, [row.id]);
   return serializeProject(row, progress.get(row.id) ?? 0);
}

export async function deleteProject(orgId: string, id: string): Promise<boolean> {
   const existing = await db.project.findFirst({ where: { orgId, id }, select: { id: true } });
   if (!existing) return false;
   // detach issues (schema has no cascade from project → issue)
   await db.$transaction([
      db.issue.updateMany({ where: { projectId: existing.id }, data: { projectId: null } }),
      db.project.delete({ where: { id: existing.id } }),
   ]);
   return true;
}
