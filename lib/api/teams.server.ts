import 'server-only';
import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { TeamCreateBody, TeamDTO, TeamUpdateBody } from './types';

/**
 * Server-side data access + Prisma <-> DTO translation for teams.
 * Mirrors issues.server.ts / projects.server.ts.
 */

const teamInclude = {
   members: { select: { userId: true } },
   projects: { select: { id: true } },
} satisfies Prisma.TeamInclude;
type TeamRow = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

export function serializeTeam(row: TeamRow, currentUserId: string): TeamDTO {
   const memberIds = row.members.map((m) => m.userId);
   return {
      id: row.key,
      name: row.name,
      icon: row.icon,
      color: row.color,
      joined: memberIds.includes(currentUserId),
      memberIds,
      projectIds: row.projects.map((p) => p.id),
      createdAt: row.createdAt.toISOString(),
   };
}

/* --------------------------------- reads -------------------------------- */

export async function listTeams(orgId: string, userId: string): Promise<TeamDTO[]> {
   const rows = await db.team.findMany({
      where: { orgId },
      include: teamInclude,
      orderBy: { key: 'asc' },
   });
   return rows.map((r) => serializeTeam(r, userId));
}

export async function getTeam(orgId: string, key: string, userId: string): Promise<TeamDTO | null> {
   const row = await db.team.findFirst({
      where: { orgId, key },
      include: teamInclude,
   });
   return row ? serializeTeam(row, userId) : null;
}

/* -------------------------------- writes -------------------------------- */

export async function createTeam(
   orgId: string,
   body: TeamCreateBody,
   userId: string
): Promise<TeamDTO> {
   const base =
      (body.id || body.name || 'TEAM')
         .toUpperCase()
         .replace(/[^A-Z0-9]/g, '')
         .slice(0, 8) || 'TEAM';
   // `key` doubles as the primary key (seed convention — see schema `Team.key`),
   // so it has to be unique within the org. Suffix on collision.
   let key = base;
   for (let n = 2; await db.team.findFirst({ where: { orgId, key }, select: { id: true } }); n++) {
      key = `${base.slice(0, 7)}${n}`;
   }

   const row = await db.team.create({
      data: {
         id: key,
         org: { connect: { id: orgId } },
         key,
         name: body.name?.trim() || key,
         icon: body.icon || '🏷️',
         color: body.color || '#95a2b3',
         // creator joins by default
         members: { create: { user: { connect: { id: userId } } } },
      },
      include: teamInclude,
   });
   return serializeTeam(row, userId);
}

export async function updateTeam(
   orgId: string,
   key: string,
   body: TeamUpdateBody,
   userId: string
): Promise<TeamDTO | null> {
   const existing = await db.team.findFirst({ where: { orgId, key }, select: { id: true } });
   if (!existing) return null;

   const data: Prisma.TeamUpdateInput = {};
   if (body.name !== undefined) data.name = body.name;
   if (body.icon !== undefined) data.icon = body.icon;
   if (body.color !== undefined) data.color = body.color;

   if (Object.keys(data).length) {
      await db.team.update({ where: { id: existing.id }, data });
   }

   // join / leave the current user
   if (body.joined === true) {
      await db.teamMembership.upsert({
         where: { userId_teamId: { userId, teamId: existing.id } },
         create: { userId, teamId: existing.id },
         update: {},
      });
   } else if (body.joined === false) {
      await db.teamMembership.deleteMany({ where: { userId, teamId: existing.id } });
   }

   const row = await db.team.findUniqueOrThrow({
      where: { id: existing.id },
      include: teamInclude,
   });
   return serializeTeam(row, userId);
}

export async function deleteTeam(orgId: string, key: string): Promise<boolean> {
   const existing = await db.team.findFirst({ where: { orgId, key }, select: { id: true } });
   if (!existing) return false;

   // Team -> Issue/Cycle is onDelete: Cascade, so refuse unless the team is empty.
   const [projects, issues, cycles] = await Promise.all([
      db.project.count({ where: { teamId: existing.id } }),
      db.issue.count({ where: { teamId: existing.id } }),
      db.cycle.count({ where: { teamId: existing.id } }),
   ]);
   if (projects || issues || cycles) {
      throw new Error('team still has projects, issues or cycles');
   }

   await db.team.delete({ where: { id: existing.id } });
   return true;
}
