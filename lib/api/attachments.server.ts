import 'server-only';

import { db } from '@/lib/db';
import { deleteBlob, makeStorageKey, MAX_ATTACHMENT_BYTES, readBlob, saveBlob } from './storage';
import { AttachmentDTO } from './types';

interface Row {
   id: string;
   filename: string;
   contentType: string;
   size: number;
   uploadedById: string | null;
   createdAt: Date;
}

const serialize = (r: Row): AttachmentDTO => ({
   id: r.id,
   filename: r.filename,
   contentType: r.contentType,
   size: r.size,
   url: `/api/attachments/${r.id}`,
   uploadedById: r.uploadedById,
   createdAt: r.createdAt.toISOString(),
});

async function resolveIssue(orgId: string, idOrIdentifier: string) {
   return db.issue.findFirst({
      where: { orgId, OR: [{ id: idOrIdentifier }, { identifier: idOrIdentifier }] },
      select: { id: true },
   });
}

export async function listAttachments(
   orgId: string,
   idOrIdentifier: string
): Promise<AttachmentDTO[] | null> {
   const issue = await resolveIssue(orgId, idOrIdentifier);
   if (!issue) return null;
   const rows = await db.attachment.findMany({
      where: { issueId: issue.id },
      orderBy: { createdAt: 'asc' },
   });
   return rows.map(serialize);
}

export async function addAttachment(
   orgId: string,
   idOrIdentifier: string,
   file: { name: string; type: string; bytes: Buffer },
   uploadedById: string
): Promise<AttachmentDTO | null> {
   const issue = await resolveIssue(orgId, idOrIdentifier);
   if (!issue) return null;
   if (file.bytes.length === 0) throw new Error('empty file');
   if (file.bytes.length > MAX_ATTACHMENT_BYTES) {
      throw new Error(`file is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB`);
   }

   const filename = file.name.replace(/[\r\n"]/g, '').slice(0, 255) || 'file';
   const storageKey = makeStorageKey(issue.id, filename);
   await saveBlob(storageKey, file.bytes);

   const row = await db.attachment.create({
      data: {
         orgId,
         issueId: issue.id,
         uploadedById,
         filename,
         contentType: file.type || 'application/octet-stream',
         size: file.bytes.length,
         storageKey,
      },
   });
   return serialize(row);
}

/** For the download route: the row + its bytes, scoped to the org. */
export async function getAttachmentBlob(orgId: string, id: string) {
   const row = await db.attachment.findFirst({ where: { id, orgId } });
   if (!row) return null;
   try {
      const bytes = await readBlob(row.storageKey);
      return { row, bytes };
   } catch {
      return null; // file vanished from disk
   }
}

export async function deleteAttachment(
   orgId: string,
   id: string,
   actor: { userId: string; role: string }
): Promise<'ok' | 'not-found' | 'forbidden'> {
   const row = await db.attachment.findFirst({ where: { id, orgId } });
   if (!row) return 'not-found';
   if (row.uploadedById !== actor.userId && actor.role !== 'ADMIN') return 'forbidden';
   await db.attachment.delete({ where: { id: row.id } });
   await deleteBlob(row.storageKey);
   return 'ok';
}
