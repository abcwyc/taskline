import 'server-only';
import { Prisma, ProjectUpdateHealth } from '@prisma/client';

import { db } from '@/lib/db';
import {
   PostProjectUpdateBody,
   ProjectDetailDTO,
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
   if (!any) throw new Error('no member to attribute the update to');
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
   if (!body?.text?.trim()) throw new Error('update text is required');

   const authorId = actorId ?? (await fallbackAuthorId(orgId));

   const row = await db.projectUpdate.create({
      data: {
         project: { connect: { id: projectId } },
         author: { connect: { id: authorId } },
         health: toPuHealth(body.health),
         blocks: textToBlocks(body.text) as unknown as Prisma.InputJsonValue,
      },
   });

   // reflect the latest update's health on the project itself
   const projectHealth = { 'on-track': 'ON_TRACK', 'at-risk': 'AT_RISK', 'off-track': 'OFF_TRACK' }[
      body.health
   ];
   if (projectHealth) {
      await db.project.update({
         where: { id: projectId },
         data: { health: projectHealth as never, healthUpdatedAt: new Date() },
      });
   }

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
