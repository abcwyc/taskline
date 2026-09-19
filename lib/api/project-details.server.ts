import 'server-only';
import { PublicError } from './http';
import { Prisma, ProjectUpdateHealth } from '@prisma/client';

import { db } from '@/lib/db';
import {
   PostProjectUpdateBody,
   ProjectDetailDTO,
   ProjectMilestoneDTO,
   ProjectUpdateDTO,
   PU_HEALTH_ENUM_TO_KEY,
   PU_HEALTH_KEY_TO_ENUM,
   RichBlocks,
} from './types';

/**
 * Server-side data access for the project detail surface (Overview / Activity):
 * summary + rich description, resources, milestones, posted updates, activity.
 * Mirrors `issues.server.ts` / `projects.server.ts`.
 */

const asBlocks = (v: Prisma.JsonValue | null | undefined): RichBlocks =>
   Array.isArray(v) ? (v as RichBlocks) : [];

const puHealthKey = (h: ProjectUpdateHealth): string => PU_HEALTH_ENUM_TO_KEY[h] ?? 'on-track';
const toPuHealth = (key: string | undefined): ProjectUpdateHealth =>
   (PU_HEALTH_KEY_TO_ENUM[key ?? 'on-track'] as ProjectUpdateHealth) ??
   ProjectUpdateHealth.ON_TRACK;

function serializeUpdate(row: {
   id: string;
   authorId: string;
   health: ProjectUpdateHealth;
   blocks: Prisma.JsonValue;
   createdAt: Date;
}): ProjectUpdateDTO {
   return {
      id: row.id,
      authorId: row.authorId,
      date: row.createdAt.toISOString().slice(0, 10),
      health: puHealthKey(row.health),
      blocks: asBlocks(row.blocks),
   };
}

/* --------------------------------- reads -------------------------------- */

export async function getProjectDetail(
   orgId: string,
   projectId: string
): Promise<ProjectDetailDTO | null> {
   const project = await db.project.findFirst({
      where: { orgId, id: projectId },
      select: { id: true },
   });
   if (!project) return null;

   const [detail, milestones, updates] = await Promise.all([
      db.projectDetail.findUnique({ where: { projectId } }),
      db.projectMilestone.findMany({ where: { projectId }, orderBy: { order: 'asc' } }),
      db.projectUpdate.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
   ]);

   const activityRaw = (detail?.activity as unknown[]) ?? [];

   return {
      projectId,
      summary: detail?.summary ?? '',
      description: asBlocks(detail?.description),
      resources: Array.isArray(detail?.resources)
         ? (detail!.resources as { label: string; url: string }[])
         : [],
      milestones: milestones.map((m) => ({
         id: m.id,
         name: m.name,
         targetDate: m.targetDate ? m.targetDate.toISOString().slice(0, 10) : null,
         completed: m.completed,
      })),
      updates: updates.map(serializeUpdate),
      activity: activityRaw
         .filter((a): a is { id: string; userId: string; date: string; text: string } => !!a)
         .map((a) => ({ id: a.id, userId: a.userId, date: a.date, text: a.text })),
   };
}

/* -------------------------------- writes -------------------------------- */

/** Split free text into paragraph ContentBlocks (matches the old mock behavior). */
function textToBlocks(text: string): RichBlocks {
   return text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ type: 'paragraph', text: p }));
}

async function fallbackAuthorId(orgId: string): Promise<string> {
   const admin = await db.membership.findFirst({
      where: { orgId, role: 'ADMIN' },
      select: { userId: true },
   });
   if (admin) return admin.userId;
   const any = await db.membership.findFirst({ where: { orgId }, select: { userId: true } });
   if (!any) throw new PublicError('no member to attribute the update to');
   return any.userId;
}

export async function addProjectUpdate(
   orgId: string,
   projectId: string,
   body: PostProjectUpdateBody,
   actorId: string | null
): Promise<ProjectUpdateDTO | null> {
   const project = await db.project.findFirst({
      where: { orgId, id: projectId },
      select: { id: true },
   });
   if (!project) return null;
   if (!body?.text?.trim()) throw new PublicError('update text is required');

   const authorId = actorId ?? (await fallbackAuthorId(orgId));

   const row = await db.$transaction(async (tx) => {
      const created = await tx.projectUpdate.create({
         data: {
            project: { connect: { id: projectId } },
            author: { connect: { id: authorId } },
            health: toPuHealth(body.health),
            blocks: textToBlocks(body.text) as unknown as Prisma.InputJsonValue,
         },
      });

      const projectHealth = {
         'on-track': 'ON_TRACK',
         'at-risk': 'AT_RISK',
         'off-track': 'OFF_TRACK',
      }[body.health];
      if (projectHealth) {
         await tx.project.update({
            where: { id: projectId },
            data: { health: projectHealth as never, healthUpdatedAt: new Date() },
         });
      }
      return created;
   });

   return serializeUpdate(row);
}

export async function setMilestoneCompleted(
   orgId: string,
   projectId: string,
   milestoneId: string,
   completed: boolean
): Promise<boolean> {
   const milestone = await db.projectMilestone.findFirst({
      where: { id: milestoneId, projectId, project: { orgId } },
      select: { id: true },
   });
   if (!milestone) return false;
   await db.projectMilestone.update({ where: { id: milestone.id }, data: { completed } });
   return true;
}

/* --------------------- milestones: full CRUD ------------------------------ */

export async function createMilestone(
   orgId: string,
   projectId: string,
   body: { name: string; targetDate?: string | null }
): Promise<ProjectMilestoneDTO | null> {
   const project = await db.project.findFirst({
      where: { orgId, id: projectId },
      select: { id: true },
   });
   if (!project) return null;
   if (!body?.name?.trim()) throw new PublicError('milestone name is required');

   const last = await db.projectMilestone.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
      select: { order: true },
   });
   const row = await db.projectMilestone.create({
      data: {
         projectId,
         name: body.name.trim(),
         targetDate: body.targetDate ? new Date(body.targetDate) : null,
         order: (last?.order ?? 0) + 1,
      },
   });
   return {
      id: row.id,
      name: row.name,
      targetDate: row.targetDate ? row.targetDate.toISOString().slice(0, 10) : null,
      completed: row.completed,
   };
}

export async function updateMilestone(
   orgId: string,
   projectId: string,
   milestoneId: string,
   body: { name?: string; targetDate?: string | null; completed?: boolean; order?: number }
): Promise<ProjectMilestoneDTO | null> {
   const milestone = await db.projectMilestone.findFirst({
      where: { id: milestoneId, projectId, project: { orgId } },
   });
   if (!milestone) return null;
   if (body.name !== undefined && !body.name.trim())
      throw new PublicError('milestone name is required');

   const row = await db.projectMilestone.update({
      where: { id: milestone.id },
      data: {
         ...(body.name !== undefined ? { name: body.name.trim() } : {}),
         ...(body.targetDate !== undefined
            ? { targetDate: body.targetDate ? new Date(body.targetDate) : null }
            : {}),
         ...(body.completed !== undefined ? { completed: body.completed } : {}),
         ...(body.order !== undefined ? { order: body.order } : {}),
      },
   });
   return {
      id: row.id,
      name: row.name,
      targetDate: row.targetDate ? row.targetDate.toISOString().slice(0, 10) : null,
      completed: row.completed,
   };
}

export async function deleteMilestone(
   orgId: string,
   projectId: string,
   milestoneId: string
): Promise<boolean> {
   const milestone = await db.projectMilestone.findFirst({
      where: { id: milestoneId, projectId, project: { orgId } },
      select: { id: true },
   });
   if (!milestone) return false;
   await db.projectMilestone.delete({ where: { id: milestone.id } });
   return true;
}

export async function deleteProjectUpdate(
   orgId: string,
   projectId: string,
   updateId: string
): Promise<boolean> {
   const update = await db.projectUpdate.findFirst({
      where: { id: updateId, projectId, project: { orgId } },
      select: { id: true },
   });
   if (!update) return false;
   await db.projectUpdate.delete({ where: { id: update.id } });
   return true;
}

/* --------------------- workspace-wide updates feed ------------------------- */

export async function listWorkspaceUpdates(
   orgId: string
): Promise<(ProjectUpdateDTO & { projectId: string; projectName: string; teamId: string })[]> {
   const rows = await db.projectUpdate.findMany({
      where: { project: { orgId } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { project: { select: { id: true, name: true, teamId: true } } },
   });
   return rows.map((r) => ({
      ...serializeUpdate(r),
      projectId: r.project.id,
      projectName: r.project.name,
      teamId: r.project.teamId,
   }));
}
