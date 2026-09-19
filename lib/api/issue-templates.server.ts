import 'server-only';
import { PublicError } from './http';

import { db } from '@/lib/db';
import { IssueTemplateDTO } from './types';

/** Server-side data access for issue templates (new-issue prefills). */

export async function listIssueTemplates(orgId: string): Promise<IssueTemplateDTO[]> {
   const rows = await db.issueTemplate.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
   });
   return rows.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      title: t.title,
      body: t.body,
      icon: t.icon,
      teamId: t.teamId,
   }));
}

export type IssueTemplateInput = Partial<Omit<IssueTemplateDTO, 'id'>> & {
   teamId?: string | null;
};

export async function createIssueTemplate(
   orgId: string,
   body: IssueTemplateInput
): Promise<IssueTemplateDTO> {
   if (!body?.name?.trim()) throw new PublicError('template name is required');
   if (body.teamId) {
      const team = await db.team.findFirst({ where: { orgId, id: body.teamId } });
      if (!team) throw new PublicError('team not found in this workspace');
   }
   const row = await db.issueTemplate.create({
      data: {
         orgId,
         teamId: body.teamId ?? null,
         name: body.name.trim(),
         description: body.description ?? '',
         title: body.title ?? '',
         body: body.body ?? '',
         icon: body.icon ?? '📄',
      },
   });
   return {
      id: row.id,
      name: row.name,
      description: row.description,
      title: row.title,
      body: row.body,
      icon: row.icon,
      teamId: row.teamId,
   };
}

export async function updateIssueTemplate(
   orgId: string,
   id: string,
   body: IssueTemplateInput
): Promise<IssueTemplateDTO | null> {
   const existing = await db.issueTemplate.findFirst({ where: { orgId, id } });
   if (!existing) return null;
   if (body.name !== undefined && !body.name.trim())
      throw new PublicError('template name is required');
   const row = await db.issueTemplate.update({
      where: { id: existing.id },
      data: {
         ...(body.name !== undefined ? { name: body.name.trim() } : {}),
         ...(body.description !== undefined ? { description: body.description } : {}),
         ...(body.title !== undefined ? { title: body.title } : {}),
         ...(body.body !== undefined ? { body: body.body } : {}),
         ...(body.icon !== undefined ? { icon: body.icon } : {}),
         ...(body.teamId !== undefined ? { teamId: body.teamId ?? null } : {}),
      },
   });
   return {
      id: row.id,
      name: row.name,
      description: row.description,
      title: row.title,
      body: row.body,
      icon: row.icon,
      teamId: row.teamId,
   };
}

export async function deleteIssueTemplate(orgId: string, id: string): Promise<boolean> {
   const existing = await db.issueTemplate.findFirst({
      where: { orgId, id },
      select: { id: true },
   });
   if (!existing) return false;
   await db.issueTemplate.delete({ where: { id: existing.id } });
   return true;
}
