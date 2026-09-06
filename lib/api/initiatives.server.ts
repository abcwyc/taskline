import 'server-only';
import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { PublicError } from './http';
import { assertOrgScope } from './ownership.server';
import {
   HEALTH_ENUM_TO_KEY,
   INITIATIVE_STATUS_ENUM_TO_KEY,
   INITIATIVE_STATUS_KEY_TO_ENUM,
   InitiativeCreateBody,
   InitiativeDTO,
   InitiativeUpdateBody,
   PRIORITY_ENUM_TO_KEY,
} from './types';

const include = {
   projects: { select: { id: true } },
   leadTeam: { select: { key: true } },
} satisfies Prisma.InitiativeInclude;
type Row = Prisma.InitiativeGetPayload<{ include: typeof include }>;

const HEALTH_BY_KEY: Record<string, string> = {
   'no-update': 'NO_UPDATE',
   'off-track': 'OFF_TRACK',
   'on-track': 'ON_TRACK',
   'at-risk': 'AT_RISK',
};
const PRIORITY_BY_KEY: Record<string, string> = {
   'no-priority': 'NO_PRIORITY',
   'urgent': 'URGENT',
   'high': 'HIGH',
   'medium': 'MEDIUM',
   'low': 'LOW',
};

function serialize(row: Row): InitiativeDTO {
   return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      status: INITIATIVE_STATUS_ENUM_TO_KEY[row.status] ?? 'active',
      priorityId: PRIORITY_ENUM_TO_KEY[row.priority] ?? 'no-priority',
      ownerId: row.ownerId,
      leadTeamId: row.leadTeam?.key ?? null,
      target: row.target,
      healthId: HEALTH_ENUM_TO_KEY[row.health] ?? 'no-update',
      projectIds: row.projects.map((p) => p.id),
      createdAt: row.createdAt.toISOString(),
   };
}

export async function listInitiatives(orgId: string): Promise<InitiativeDTO[]> {
   const rows = await db.initiative.findMany({
      where: { orgId },
      include,
      orderBy: { createdAt: 'asc' },
   });
   return rows.map(serialize);
}

export async function getInitiative(orgId: string, id: string): Promise<InitiativeDTO | null> {
   const row = await db.initiative.findFirst({ where: { orgId, id }, include });
   return row ? serialize(row) : null;
}

async function teamIdForKey(orgId: string, key: string | null | undefined) {
   if (!key) return null;
   const t = await db.team.findFirst({ where: { orgId, key }, select: { id: true } });
   return t?.id ?? null;
}

function projectSet(ids: string[] | undefined) {
   if (ids === undefined) return undefined;
   return { set: ids.map((id) => ({ id })) };
}

export async function createInitiative(
   orgId: string,
   body: InitiativeCreateBody
): Promise<InitiativeDTO> {
   await assertOrgScope(db, orgId, {
      ownerId: body.ownerId ?? undefined,
      labelIds: undefined,
   });
   if (body.projectIds?.length) {
      const n = await db.project.count({ where: { id: { in: body.projectIds }, orgId } });
      if (n !== new Set(body.projectIds).size) throw new PublicError('unknown project', 400);
   }
   const leadTeamId = await teamIdForKey(orgId, body.leadTeamId);
   const row = await db.initiative.create({
      data: {
         org: { connect: { id: orgId } },
         name: body.name?.trim() || 'New initiative',
         description: body.description ?? null,
         icon: body.icon || '🎯',
         status: (INITIATIVE_STATUS_KEY_TO_ENUM[body.status ?? 'active'] ?? 'ACTIVE') as never,
         priority: (PRIORITY_BY_KEY[body.priorityId ?? 'no-priority'] ?? 'NO_PRIORITY') as never,
         health: (HEALTH_BY_KEY[body.healthId ?? 'no-update'] ?? 'NO_UPDATE') as never,
         target: body.target ?? null,
         owner: body.ownerId ? { connect: { id: body.ownerId } } : undefined,
         leadTeam: leadTeamId ? { connect: { id: leadTeamId } } : undefined,
         projects: body.projectIds ? { connect: body.projectIds.map((id) => ({ id })) } : undefined,
      },
      include,
   });
   return serialize(row);
}

export async function updateInitiative(
   orgId: string,
   id: string,
   body: InitiativeUpdateBody
): Promise<InitiativeDTO | null> {
   const existing = await db.initiative.findFirst({ where: { orgId, id }, select: { id: true } });
   if (!existing) return null;

   const data: Prisma.InitiativeUpdateInput = {};
   if (body.name !== undefined) data.name = body.name;
   if (body.description !== undefined) data.description = body.description;
   if (body.icon !== undefined) data.icon = body.icon;
   if (body.status !== undefined) {
      data.status = (INITIATIVE_STATUS_KEY_TO_ENUM[body.status] ?? 'ACTIVE') as never;
   }
   if (body.priorityId !== undefined) {
      data.priority = (PRIORITY_BY_KEY[body.priorityId] ?? 'NO_PRIORITY') as never;
   }
   if (body.healthId !== undefined) {
      data.health = (HEALTH_BY_KEY[body.healthId] ?? 'NO_UPDATE') as never;
   }
   if (body.target !== undefined) data.target = body.target;
   if (body.ownerId !== undefined) {
      data.owner = body.ownerId ? { connect: { id: body.ownerId } } : { disconnect: true };
   }
   if (body.leadTeamId !== undefined) {
      const tid = await teamIdForKey(orgId, body.leadTeamId);
      data.leadTeam = tid ? { connect: { id: tid } } : { disconnect: true };
   }
   const projects = projectSet(body.projectIds);
   if (projects) data.projects = projects;

   const row = await db.initiative.update({ where: { id: existing.id }, data, include });
   return serialize(row);
}

export async function deleteInitiative(orgId: string, id: string): Promise<boolean> {
   const existing = await db.initiative.findFirst({ where: { orgId, id }, select: { id: true } });
   if (!existing) return false;
   await db.initiative.delete({ where: { id: existing.id } });
   return true;
}
