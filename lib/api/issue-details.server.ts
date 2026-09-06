import 'server-only';
import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { onIssueCommented } from './issue-events.server';
import { readBlocks, storeBlocks, textToBlocks } from './rich-text';
import {
   IssueActivityDTO,
   IssueCommentDTO,
   IssueDetailDTO,
   PostCommentBody,
   PR_STATUS_ENUM_TO_KEY,
} from './types';

/** Server-side data access for the issue detail surface. */

const detailInclude = {
   comments: { orderBy: { createdAt: 'asc' } },
   activity: { orderBy: { createdAt: 'asc' } },
   prLinks: true,
   relations: true,
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

   // relation targets -> identifiers
   const relatedIssueIds = row.relations.map((r) => r.relatedIssueId);
   const targets = relatedIssueIds.length
      ? await db.issue.findMany({
           where: { id: { in: relatedIssueIds } },
           select: { id: true, identifier: true },
        })
      : [];
   const identifierOf = new Map(targets.map((t) => [t.id, t.identifier]));

   const related: string[] = [];
   const blockedBy: string[] = [];
   for (const r of row.relations) {
      const ident = identifierOf.get(r.relatedIssueId);
      if (!ident) continue;
      if (r.type === 'BLOCKED_BY' || r.type === 'BLOCKS') blockedBy.push(ident);
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
   if (!body?.text?.trim()) throw new Error('comment text is required');

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
   return serializeComment(c as DetailRow['comments'][number]);
}
