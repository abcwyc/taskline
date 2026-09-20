import 'server-only';
import { PublicError } from './http';

import { db } from '@/lib/db';
import { DocumentFolderDTO } from './types';

/** Server-side data access for document folders (the team documents tree). */

export async function listFolders(orgId: string, teamId?: string): Promise<DocumentFolderDTO[]> {
   const rows = await db.documentFolder.findMany({
      where: { orgId, ...(teamId ? { teamId } : {}) },
      orderBy: { order: 'asc' },
      include: { documents: { orderBy: { createdAt: 'desc' } } },
   });
   return rows.map((f) => ({
      id: f.id,
      name: f.name,
      icon: f.icon,
      teamId: f.teamId,
      documents: f.documents.map((d) => ({
         id: d.id,
         name: d.name,
         icon: d.icon,
         pinned: d.pinned,
         creatorId: d.creatorId,
         createdAt: d.createdAt.toISOString(),
         updatedAt: d.updatedAt.toISOString(),
      })),
   }));
}

export async function createFolder(
   orgId: string,
   body: { name: string; icon?: string; teamId?: string | null }
): Promise<DocumentFolderDTO> {
   if (!body.name?.trim()) throw new PublicError('folder name is required');
   if (body.teamId) {
      const team = await db.team.findFirst({ where: { orgId, id: body.teamId } });
      if (!team) throw new PublicError('team not found in this workspace');
   }
   const last = await db.documentFolder.findFirst({
      where: { orgId },
      orderBy: { order: 'desc' },
      select: { order: true },
   });
   const row = await db.documentFolder.create({
      data: {
         orgId,
         teamId: body.teamId ?? null,
         name: body.name.trim(),
         icon: body.icon ?? '📁',
         order: (last?.order ?? 0) + 1,
      },
   });
   return { id: row.id, name: row.name, icon: row.icon, teamId: row.teamId, documents: [] };
}

export async function updateFolder(
   orgId: string,
   folderId: string,
   body: { name?: string; icon?: string; order?: number }
): Promise<DocumentFolderDTO | null> {
   const row = await db.documentFolder.findFirst({ where: { orgId, id: folderId } });
   if (!row) return null;
   if (body.name !== undefined && !body.name.trim())
      throw new PublicError('folder name is required');
   const updated = await db.documentFolder.update({
      where: { id: row.id },
      data: {
         ...(body.name !== undefined ? { name: body.name.trim() } : {}),
         ...(body.icon !== undefined ? { icon: body.icon } : {}),
         ...(body.order !== undefined ? { order: body.order } : {}),
      },
   });
   return {
      id: updated.id,
      name: updated.name,
      icon: updated.icon,
      teamId: updated.teamId,
      documents: [],
   };
}

export async function deleteFolder(
   orgId: string,
   folderId: string
): Promise<boolean | 'not-empty'> {
   const row = await db.documentFolder.findFirst({
      where: { orgId, id: folderId },
      include: { _count: { select: { documents: true } } },
   });
   if (!row) return false;
   if (row._count.documents > 0) return 'not-empty';
   await db.documentFolder.delete({ where: { id: row.id } });
   return true;
}
