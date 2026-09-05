import 'server-only';
import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { ViewCreateBody, ViewDTO, ViewUpdateBody } from './types';

const include = { team: { select: { key: true } } } satisfies Prisma.SavedViewInclude;
type Row = Prisma.SavedViewGetPayload<{ include: typeof include }>;

const serialize = (row: Row): ViewDTO => ({
   id: row.id,
   name: row.name,
   description: row.description,
   icon: row.icon,
   type: row.type === 'PROJECT' ? 'project' : 'issue',
   teamId: row.team?.key ?? null,
   ownerId: row.ownerId,
   filter: (row.filter as Record<string, unknown>) ?? {},
   createdAt: row.createdAt.toISOString(),
   updatedAt: row.updatedAt.toISOString(),
});

async function teamId(orgId: string, key: string | null | undefined) {
   if (!key) return null;
   return (await db.team.findFirst({ where: { orgId, key }, select: { id: true } }))?.id ?? null;
}

export async function listViews(orgId: string): Promise<ViewDTO[]> {
   const rows = await db.savedView.findMany({
      where: { orgId },
      include,
      orderBy: { createdAt: 'asc' },
   });
   return rows.map(serialize);
}

export async function getView(orgId: string, id: string): Promise<ViewDTO | null> {
   const row = await db.savedView.findFirst({ where: { orgId, id }, include });
   return row ? serialize(row) : null;
}

export async function createView(
   orgId: string,
   body: ViewCreateBody,
   ownerId: string
): Promise<ViewDTO> {
   const tid = await teamId(orgId, body.teamId);
   const row = await db.savedView.create({
      data: {
         org: { connect: { id: orgId } },
         owner: { connect: { id: ownerId } },
         name: body.name?.trim() || 'New view',
         description: body.description ?? '',
         icon: body.icon || '🔎',
         type: body.type === 'project' ? 'PROJECT' : 'ISSUE',
         team: tid ? { connect: { id: tid } } : undefined,
         filter: (body.filter ?? {}) as Prisma.InputJsonValue,
      },
      include,
   });
   return serialize(row);
}

export async function updateView(
   orgId: string,
   id: string,
   body: ViewUpdateBody
): Promise<ViewDTO | null> {
   const existing = await db.savedView.findFirst({ where: { orgId, id }, select: { id: true } });
   if (!existing) return null;

   const data: Prisma.SavedViewUpdateInput = {};
   if (body.name !== undefined) data.name = body.name;
   if (body.description !== undefined) data.description = body.description;
   if (body.icon !== undefined) data.icon = body.icon;
   if (body.type !== undefined) data.type = body.type === 'project' ? 'PROJECT' : 'ISSUE';
   if (body.filter !== undefined) data.filter = body.filter as Prisma.InputJsonValue;
   if (body.teamId !== undefined) {
      const tid = await teamId(orgId, body.teamId);
      data.team = tid ? { connect: { id: tid } } : { disconnect: true };
   }

   const row = await db.savedView.update({ where: { id: existing.id }, data, include });
   return serialize(row);
}

export async function deleteView(orgId: string, id: string): Promise<boolean> {
   const existing = await db.savedView.findFirst({ where: { orgId, id }, select: { id: true } });
   if (!existing) return false;
   await db.savedView.delete({ where: { id: existing.id } });
   return true;
}
