import 'server-only';
import { PublicError } from './http';
import { Prisma, RelationType } from '@prisma/client';

import { db } from '@/lib/db';
import { realtimeBus } from '@/lib/realtime.server';
import { onIssueCommented } from './issue-events.server';
import { readBlocks, storeBlocks, textToBlocks } from './rich-text';
import {
   IssueActivityDTO,
   IssueCommentDTO,
   IssueDetailDTO,
   PostCommentBody,
   PR_STATUS_ENUM_TO_KEY,
   PR_STATUS_KEY_TO_ENUM,
   RELATION_ENUM_TO_KEY,
   RELATION_KEY_TO_ENUM,
   RelationEntryDTO,
} from './types';

/** Server-side data access for the issue detail surface. */

const detailInclude = {
   comments: { orderBy: { createdAt: 'asc' } },
   activity: { orderBy: { createdAt: 'asc' } },
   prLinks: true,
   relations: true,
   relatedRelations: true,
   children: { select: { identifier: true } },
} satisfies Prisma.IssueInclude;
type DetailRow = Prisma.IssueGetPayload<{ include: typeof detailInclude }>;

function serializeComment(c: DetailRow['comments'][number]): IssueCommentDTO {
   return {
      id: c.id,
      authorId: c.authorId,
      body: readBlocks(c.body),
      reactions: Array.isArray(c.reactions)
         ? (c.reactions as { emoji: string; count: number }[])
         : [],
      editedAt: c.editedAt ? c.editedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
   };
}

function serializeActivity(a: DetailRow['activity'][number]): IssueActivityDTO {
   const label: Record<string, string> = {
      status: 'status',
      assignee: 'assignee',
      priority: 'priority',
      project: 'project',
      title: 'title',
      dueDate: 'due date',
      label: 'labels',
      description: 'description',
   };
   let text: string;
   if (a.verb === 'created' || a.field === 'created') {
      text = 'created the issue';
   } else if (a.field === 'description') {
      text = 'edited the description';
   } else if (a.field === 'cycle') {
      text = a.newValue ?? 'updated the cycle';
   } else if (a.field === 'assignee') {
      text = a.newValue ? `assigned this to ${a.newValue}` : 'unassigned this';
   } else if (a.field && a.newValue) {
      text = `changed ${label[a.field] ?? a.field} to ${a.newValue}`;
   } else if (a.field && a.oldValue) {
      text = `cleared the ${label[a.field] ?? a.field}`;
   } else if (a.verb === 'created') {
      text = 'created the issue';
   } else {
      text = a.verb;
   }
   return {
      id: a.id,
      actorId: a.actorId,
      verb: a.verb,
      field: a.field,
      text,
      createdAt: a.createdAt.toISOString(),
   };
}

export async function getIssueDetail(
   orgId: string,
   idOrIdentifier: string,
   userId?: string
): Promise<IssueDetailDTO | null> {
   const row = await db.issue.findFirst({
      where: { orgId, OR: [{ id: idOrIdentifier }, { identifier: idOrIdentifier }] },
      include: detailInclude,
   });
   if (!row) return null;

   const subscribed = userId
      ? Boolean(
           await db.issueSubscriber.findUnique({
              where: { issueId_userId: { issueId: row.id, userId } },
              select: { issueId: true },
           })
        )
      : false;

   // relation targets -> identifiers (both directions)
   const targetIds = [
      ...row.relations.map((r) => r.relatedIssueId),
      ...row.relatedRelations.map((r) => r.issueId),
   ];
   const targets = targetIds.length
      ? await db.issue.findMany({
           where: { id: { in: targetIds } },
           select: { id: true, identifier: true },
        })
      : [];
   const identifierOf = new Map(targets.map((t) => [t.id, t.identifier]));

   const related: string[] = [];
   const blockedBy: string[] = [];
   const blocks: string[] = [];
   const entries: RelationEntryDTO[] = [];
   for (const r of row.relations) {
      const ident = identifierOf.get(r.relatedIssueId);
      if (!ident) continue;
      entries.push({
         id: r.id,
         type: RELATION_ENUM_TO_KEY[r.type] ?? 'related',
         targetIdentifier: ident,
      });
      if (r.type === 'BLOCKED_BY') blockedBy.push(ident);
      else if (r.type === 'BLOCKS') blocks.push(ident);
      else related.push(ident);
   }
   // incoming edges: X BLOCKS me → blockedBy; X BLOCKED_BY me → I block X
   for (const r of row.relatedRelations) {
      const ident = identifierOf.get(r.issueId);
      if (!ident) continue;
      entries.push({
         id: r.id,
         type: RELATION_ENUM_TO_KEY[r.type] ?? 'related',
         targetIdentifier: ident,
      });
      if (r.type === 'BLOCKS') blockedBy.push(ident);
      else if (r.type === 'BLOCKED_BY') blocks.push(ident);
      else related.push(ident);
   }

   return {
      identifier: row.identifier,
      description: readBlocks(row.description),
      comments: row.comments.map(serializeComment),
      activity: row.activity.map(serializeActivity),
      subIssueIds: row.children.map((c) => c.identifier),
      relatedIds: related,
      blockedByIds: blockedBy,
      blocksIds: blocks,
      relationEntries: entries,
      prLinks: row.prLinks.map((p) => ({
         id: p.id,
         title: p.title,
         url: p.url,
         status: PR_STATUS_ENUM_TO_KEY[p.status] ?? 'open',
      })),
      milestone: row.milestoneId,
      subscribed,
   };
}

export async function addIssueComment(
   orgId: string,
   idOrIdentifier: string,
   body: PostCommentBody,
   authorId: string
): Promise<IssueCommentDTO | null> {
   const issue = await db.issue.findFirst({
      where: { orgId, OR: [{ id: idOrIdentifier }, { identifier: idOrIdentifier }] },
      select: { id: true, identifier: true },
   });
   if (!issue) return null;
   if (!body?.text?.trim()) throw new PublicError('comment text is required');

   const c = await db.$transaction(async (tx) => {
      const comment = await tx.issueComment.create({
         data: {
            issue: { connect: { id: issue.id } },
            author: { connect: { id: authorId } },
            body: storeBlocks(textToBlocks(body.text)),
         },
      });
      await onIssueCommented(tx, {
         issueId: issue.id,
         actorId: authorId,
         preview: body.text.trim(),
      });
      return comment;
   });
   realtimeBus.publish(orgId, { resource: 'comment', action: 'created', id: issue.id });
   return serializeComment(c as DetailRow['comments'][number]);
}

/* ------------------------- comments: edit / delete ------------------------- */

/** Author or admin only. */
function assertCanEditComment(authorId: string, actor: { userId: string; role: string }): void {
   if (authorId !== actor.userId && actor.role !== 'ADMIN') {
      throw new PublicError('only the author or an admin can modify this comment', 403);
   }
}

export async function updateIssueComment(
   orgId: string,
   idOrIdentifier: string,
   commentId: string,
   body: PostCommentBody,
   actor: { userId: string; role: string }
): Promise<IssueCommentDTO | null> {
   const issue = await db.issue.findFirst({
      where: { orgId, OR: [{ id: idOrIdentifier }, { identifier: idOrIdentifier }] },
      select: { id: true },
   });
   if (!issue) return null;
   const comment = await db.issueComment.findFirst({
      where: { id: commentId, issueId: issue.id },
   });
   if (!comment) return null;
   assertCanEditComment(comment.authorId, actor);
   if (!body?.text?.trim()) throw new PublicError('comment text is required');

   const updated = await db.$transaction(async (tx) => {
      const row = await tx.issueComment.update({
         where: { id: comment.id },
         data: { body: storeBlocks(textToBlocks(body.text)), editedAt: new Date() },
      });
      await tx.issueActivity.create({
         data: {
            issueId: issue.id,
            actorId: actor.userId,
            verb: 'edited',
            field: 'comment',
            oldValue: null,
            newValue: null,
         },
      });
      return row;
   });
   return serializeComment(updated as DetailRow['comments'][number]);
}

export async function deleteIssueComment(
   orgId: string,
   idOrIdentifier: string,
   commentId: string,
   actor: { userId: string; role: string }
): Promise<boolean> {
   const issue = await db.issue.findFirst({
      where: { orgId, OR: [{ id: idOrIdentifier }, { identifier: idOrIdentifier }] },
      select: { id: true },
   });
   if (!issue) return false;
   const comment = await db.issueComment.findFirst({
      where: { id: commentId, issueId: issue.id },
      select: { id: true, authorId: true },
   });
   if (!comment) return false;
   assertCanEditComment(comment.authorId, actor);

   await db.$transaction(async (tx) => {
      await tx.issueComment.delete({ where: { id: comment.id } });
      await tx.issueActivity.create({
         data: {
            issueId: issue.id,
            actorId: actor.userId,
            verb: 'deleted',
            field: 'comment',
            oldValue: null,
            newValue: null,
         },
      });
   });
   return true;
}

/* ------------------------------ relations --------------------------------- */

async function findIssueInOrg(
   client: Prisma.TransactionClient | typeof db,
   orgId: string,
   idOrIdentifier: string
) {
   return client.issue.findFirst({
      where: { orgId, OR: [{ id: idOrIdentifier }, { identifier: idOrIdentifier }] },
      select: { id: true, identifier: true },
   });
}

export async function addIssueRelation(
   orgId: string,
   idOrIdentifier: string,
   input: { relatedId: string; type: string },
   actorId: string
): Promise<{ relation: RelationEntryDTO } | null> {
   const toEnum = (RELATION_KEY_TO_ENUM as Record<string, RelationType>)[input.type];
   if (!toEnum) throw new PublicError('invalid relation type');

   const issue = await findIssueInOrg(db, orgId, idOrIdentifier);
   if (!issue) return null;
   const target = await findIssueInOrg(db, orgId, input.relatedId);
   if (!target) throw new PublicError('related issue not found in this workspace');
   if (target.id === issue.id) throw new PublicError('an issue cannot relate to itself');

   const relation = await db.$transaction(async (tx) => {
      const existing = await tx.issueRelation.findFirst({
         where: {
            OR: [
               { issueId: issue.id, relatedIssueId: target.id },
               { issueId: target.id, relatedIssueId: issue.id },
            ],
         },
         select: { id: true },
      });
      if (existing) throw new PublicError('these issues are already related');

      return tx.issueRelation.create({
         data: {
            issueId: issue.id,
            relatedIssueId: target.id,
            type: toEnum,
         },
      });
   });

   await db.issueActivity.create({
      data: {
         issueId: issue.id,
         actorId,
         verb: 'updated',
         field: input.type === 'blocks' || input.type === 'blocked-by' ? 'blocked' : 'related',
         oldValue: null,
         newValue: target.identifier,
      },
   });

   return { relation: { id: relation.id, type: input.type, targetIdentifier: target.identifier } };
}

export async function removeIssueRelation(
   orgId: string,
   idOrIdentifier: string,
   relationId: string,
   actorId: string
): Promise<boolean> {
   const issue = await findIssueInOrg(db, orgId, idOrIdentifier);
   if (!issue) return false;
   const relation = await db.issueRelation.findFirst({
      where: { id: relationId, OR: [{ issueId: issue.id }, { relatedIssueId: issue.id }] },
   });
   if (!relation) return false;

   await db.$transaction(async (tx) => {
      await tx.issueRelation.delete({ where: { id: relation.id } });
      await tx.issueActivity.create({
         data: {
            issueId: issue.id,
            actorId,
            verb: 'updated',
            field: 'unblocked',
            oldValue: null,
            newValue: null,
         },
      });
   });
   return true;
}

/* ------------------------------- PR links --------------------------------- */

export async function addPrLink(
   orgId: string,
   idOrIdentifier: string,
   input: { title: string; url: string },
   actorId: string
): Promise<{ id: string; title: string; url: string; status: string } | null> {
   const issue = await findIssueInOrg(db, orgId, idOrIdentifier);
   if (!issue) return null;

   const created = await db.$transaction(async (tx) => {
      const row = await tx.prLink.create({
         data: {
            issueId: issue.id,
            title: input.title,
            url: input.url,
            status: 'OPEN',
         },
      });
      await tx.issueActivity.create({
         data: {
            issueId: issue.id,
            actorId,
            verb: 'updated',
            field: 'pr',
            oldValue: null,
            newValue: input.title,
         },
      });
      return row;
   });
   return {
      id: created.id,
      title: created.title,
      url: created.url,
      status: PR_STATUS_ENUM_TO_KEY[created.status] ?? 'open',
   };
}

export async function updatePrLinkStatus(
   orgId: string,
   idOrIdentifier: string,
   prLinkId: string,
   status: string
): Promise<boolean> {
   const toEnum = PR_STATUS_KEY_TO_ENUM[status];
   if (!toEnum) throw new PublicError('invalid PR status');
   const issue = await findIssueInOrg(db, orgId, idOrIdentifier);
   if (!issue) return false;
   const res = await db.prLink.updateMany({
      where: { id: prLinkId, issueId: issue.id },
      data: { status: toEnum as never },
   });
   return res.count > 0;
}

export async function removePrLink(
   orgId: string,
   idOrIdentifier: string,
   prLinkId: string,
   actorId: string
): Promise<boolean> {
   const issue = await findIssueInOrg(db, orgId, idOrIdentifier);
   if (!issue) return false;
   const link = await db.prLink.findFirst({
      where: { id: prLinkId, issueId: issue.id },
      select: { id: true, title: true },
   });
   if (!link) return false;

   await db.$transaction(async (tx) => {
      await tx.prLink.delete({ where: { id: link.id } });
      await tx.issueActivity.create({
         data: {
            issueId: issue.id,
            actorId,
            verb: 'updated',
            field: 'pr',
            oldValue: link.title,
            newValue: null,
         },
      });
   });
   return true;
}
