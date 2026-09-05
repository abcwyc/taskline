import 'server-only';

import { db } from '@/lib/db';
import { LabelCreateBody, LabelDTO, LabelUpdateBody } from './types';

/** Server-side data access for workspace labels. */

const serialize = (row: { key: string; name: string; color: string }): LabelDTO => ({
   id: row.key,
   name: row.name,
   color: row.color,
});

export async function listLabels(orgId: string): Promise<LabelDTO[]> {
   const rows = await db.label.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
   return rows.map(serialize);
}

export async function createLabel(orgId: string, body: LabelCreateBody): Promise<LabelDTO> {
   const base = (body.id || body.name || 'label')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
   // ensure the key is unique in the org
   let key = base || 'label';
   for (let i = 2; await db.label.findFirst({ where: { orgId, key } }); i++) key = `${base}-${i}`;

   const row = await db.label.create({
      data: {
         org: { connect: { id: orgId } },
         key,
         name: body.name?.trim() || key,
         color: body.color || 'gray',
      },
   });
   return serialize(row);
}

export async function updateLabel(
   orgId: string,
   key: string,
   body: LabelUpdateBody
): Promise<LabelDTO | null> {
   const existing = await db.label.findFirst({ where: { orgId, key }, select: { id: true } });
   if (!existing) return null;
   const row = await db.label.update({
      where: { id: existing.id },
      data: {
         ...(body.name !== undefined ? { name: body.name } : {}),
         ...(body.color !== undefined ? { color: body.color } : {}),
      },
   });
   return serialize(row);
}

export async function deleteLabel(orgId: string, key: string): Promise<boolean> {
   const existing = await db.label.findFirst({ where: { orgId, key }, select: { id: true } });
   if (!existing) return false;
   await db.label.delete({ where: { id: existing.id } }); // IssueLabel/ProjectLabel cascade
   return true;
}
