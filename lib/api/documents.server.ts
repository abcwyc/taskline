import 'server-only';

import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { PublicError } from './http';
import {
   DocumentContentDTO,
   DocumentCreateBody,
   DocumentDetailDTO,
   DocumentFolderDTO,
   DocumentUpdateBody,
} from './types';

export async function listFolders(orgId: string): Promise<DocumentFolderDTO[]> {
   const rows = await db.documentFolder.findMany({
      where: { orgId },
      include: { documents: { orderBy: { createdAt: 'asc' } } },
      orderBy: { order: 'asc' },
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

export async function createDocument(orgId: string, body: DocumentCreateBody, creatorId: string) {
   if (body.folderId) {
      const owned = await db.documentFolder.findFirst({
         where: { id: body.folderId, orgId },
         select: { id: true },
      });
      if (!owned) throw new PublicError('unknown folder', 400);
   }
   let folderId = body.folderId;
   if (!folderId) {
      const first = await db.documentFolder.findFirst({
         where: { orgId },
         orderBy: { order: 'asc' },
      });
      folderId = first?.id;
   }
   if (!folderId) {
      const created = await db.documentFolder.create({
         data: { org: { connect: { id: orgId } }, name: 'Documents', icon: '📁' },
      });
      folderId = created.id;
   }
   const doc = await db.document.create({
      data: {
         folder: { connect: { id: folderId } },
         creator: { connect: { id: creatorId } },
         name: body.name?.trim() || 'Untitled',
         icon: body.icon || '📄',
         pinned: body.pinned ?? false,
      },
   });
   return {
      id: doc.id,
      name: doc.name,
      icon: doc.icon,
      pinned: doc.pinned,
      creatorId: doc.creatorId,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
   };
}

export async function getDocument(orgId: string, id: string): Promise<DocumentDetailDTO | null> {
   const doc = await db.document.findFirst({
      where: { id, folder: { orgId } },
   });
   if (!doc) return null;
   return {
      id: doc.id,
      name: doc.name,
      icon: doc.icon,
      pinned: doc.pinned,
      folderId: doc.folderId,
      content: (doc.content as DocumentContentDTO | null) ?? null,
      creatorId: doc.creatorId,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
   };
}

export async function updateDocument(orgId: string, id: string, body: DocumentUpdateBody) {
   const doc = await db.document.findFirst({
      where: { id, folder: { orgId } },
      select: { id: true },
   });
   if (!doc) return null;
   const updated = await db.document.update({
      where: { id: doc.id },
      data: {
         ...(body.name !== undefined ? { name: body.name } : {}),
         ...(body.icon !== undefined ? { icon: body.icon } : {}),
         ...(body.pinned !== undefined ? { pinned: body.pinned } : {}),
         ...(body.content !== undefined ? { content: body.content as Prisma.InputJsonValue } : {}),
      },
   });
   return {
      id: updated.id,
      name: updated.name,
      icon: updated.icon,
      pinned: updated.pinned,
      creatorId: updated.creatorId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
   };
}

export async function deleteDocument(orgId: string, id: string): Promise<boolean> {
   const doc = await db.document.findFirst({
      where: { id, folder: { orgId } },
      select: { id: true },
   });
   if (!doc) return false;
   await db.document.delete({ where: { id: doc.id } });
   return true;
}
