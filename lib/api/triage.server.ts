import 'server-only';

import { PublicError } from './http';

import { db } from '@/lib/db';
import { createIssue } from './issues.server';
import { IssueDTO, TriageItemDTO } from './types';

type Row = Awaited<ReturnType<typeof db.triageItem.findMany>>[number] & {
   team: { key: string };
   reporterUser: { id: string } | null;
};

const serialize = (row: Row): TriageItemDTO => ({
   id: row.id,
   identifier: row.identifier,
   title: row.title,
   teamId: row.team.key,
   reporterKind: row.reporterKind,
   reporterUserId: row.reporterUserId,
   reporterName: row.reporterName,
   receivedAt: row.receivedAt.toISOString(),
   sections: Array.isArray(row.sections) ? (row.sections as unknown[]) : [],
   intelligence:
      row.intelligence && typeof row.intelligence === 'object'
         ? (row.intelligence as Record<string, unknown>)
         : {},
   preview:
      row.preview && typeof row.preview === 'object'
         ? (row.preview as Record<string, unknown>)
         : null,
   status: row.status.toLowerCase(),
});

export async function listTriage(orgId: string): Promise<TriageItemDTO[]> {
   const rows = await db.triageItem.findMany({
      where: { orgId, status: 'PENDING' },
      include: { team: { select: { key: true } }, reporterUser: { select: { id: true } } },
      orderBy: { receivedAt: 'desc' },
   });
   return rows.map((r) => serialize(r as Row));
}

export async function setTriageStatus(
   orgId: string,
   id: string,
   status: 'declined' | 'snoozed'
): Promise<boolean> {
   const res = await db.triageItem.updateMany({
      where: { id, orgId },
      data: { status: status.toUpperCase() as 'DECLINED' | 'SNOOZED' },
   });
   return res.count > 0;
}

/** Promote a triage item into a real issue. */
export async function acceptTriage(
   orgId: string,
   id: string,
   actorId: string
): Promise<IssueDTO | null> {
   const item = await db.triageItem.findFirst({
      where: { id, orgId },
      include: { team: { select: { key: true } } },
   });
   if (!item) return null;

   const intel = (item.intelligence ?? {}) as {
      suggestedAssigneeId?: string | null;
      suggestedProjectId?: string | null;
      suggestedLabelKeys?: string[];
   };
   const sections = (Array.isArray(item.sections) ? item.sections : []) as { body?: string }[];

   const issue = await createIssue(
      orgId,
      {
         title: item.title,
         description: sections.map((s) => s.body ?? '').join('\n\n'),
         statusId: 'to-do',
         assigneeId: intel.suggestedAssigneeId ?? null,
         projectId: intel.suggestedProjectId ?? null,
         labelIds: intel.suggestedLabelKeys ?? [],
      },
      actorId
   );

   await db.triageItem.update({
      where: { id: item.id },
      data: { status: 'ACCEPTED', promotedIssue: { connect: { id: issue.id } } },
   });
   return issue;
}

/** User-submitted ask / customer request → team intake queue (TriageItem). */
export async function createTriageItem(
   orgId: string,
   body: { title: string; description: string; teamId: string },
   reporterId: string
): Promise<TriageItemDTO> {
   const team = await db.team.findFirst({
      where: { orgId, id: body.teamId },
      select: { id: true, key: true },
   });
   if (!team) throw new PublicError('team not found in this workspace');
   if (!body.title?.trim()) throw new PublicError('title is required');

   const last = await db.triageItem.findFirst({
      where: { orgId },
      orderBy: { identifier: 'desc' },
      select: { identifier: true },
   });
   const lastNum = last ? Number(last.identifier.split('-')[1] ?? 0) : 0;
   const identifier = `REQ-${(Number.isFinite(lastNum) ? lastNum : 0) + 1}`;

   const row = await db.triageItem.create({
      data: {
         orgId,
         teamId: team.id,
         identifier,
         title: body.title.trim(),
         reporterKind: 'user',
         reporterUserId: reporterId,
         receivedAt: new Date(),
         sections: [{ heading: 'Details', body: body.description ?? '' }],
         intelligence: {},
         status: 'PENDING',
      },
      include: { team: { select: { key: true } }, reporterUser: { select: { id: true } } },
   });
   return serialize(row as Row);
}

/** Requests submitted by a specific user (their "asks"). */
export async function listTriageByReporter(
   orgId: string,
   reporterUserId: string,
   includeAllStatuses = true
): Promise<TriageItemDTO[]> {
   const rows = await db.triageItem.findMany({
      where: {
         orgId,
         reporterUserId,
         ...(includeAllStatuses ? {} : { status: 'PENDING' }),
      },
      include: { team: { select: { key: true } }, reporterUser: { select: { id: true } } },
      orderBy: { receivedAt: 'desc' },
   });
   return rows.map((r) => serialize(r as Row));
}
