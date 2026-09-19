import 'server-only';
import { PublicError } from './http';
import { Prisma, PrismaClient, ReviewStatus } from '@prisma/client';

import { db } from '@/lib/db';
import { sendNotificationEmails } from './email';
import type { Review } from '@/mock-data/reviews';
import { parseUnifiedDiff } from './diff';

/**
 * Server-side data access for the review surface.
 *
 * Circle has no VCS integration: a review is created by pasting a unified
 * diff. The diff is parsed server-side into per-file stats + raw patches,
 * stored in `Review.data`. Seeded demo rows keep their fixture payloads.
 */

type Db = PrismaClient | Prisma.TransactionClient;

const STATUS_ENUM_TO_KEY: Record<string, Review['status']> = {
   OPEN: 'open',
   MERGED: 'merged',
   CLOSED: 'closed',
};
const STATUS_KEY_TO_ENUM: Record<string, ReviewStatus> = {
   open: 'OPEN',
   merged: 'MERGED',
   closed: 'CLOSED',
};

const relTime = (from: Date): string => {
   const seconds = Math.max(1, Math.floor((Date.now() - from.getTime()) / 1000));
   if (seconds < 60) return `${seconds}s ago`;
   const minutes = Math.floor(seconds / 60);
   if (minutes < 60) return `${minutes}m ago`;
   const hours = Math.floor(minutes / 60);
   if (hours < 24) return `${hours}h ago`;
   return `${Math.floor(hours / 24)}d ago`;
};

type Row = Awaited<ReturnType<typeof db.review.findMany>>[number];

function serialize(
   row: Row,
   viewerId: string,
   comments: ReviewCommentDTO[] = []
): Review & {
   comments: ReviewCommentDTO[];
} {
   const d = (row.data ?? {}) as {
      timeAgo?: string;
      resolvesTitle?: string;
      files?: Review['files'];
      commits?: Review['commits'];
      summary?: string[];
      testPlan?: Review['testPlan'];
      deployment?: Review['deployment'] | null;
      reviewNote?: Review['reviewNote'] | null;
      diffs?: Record<string, string>;
   };
   return {
      id: row.id,
      title: row.title,
      status: STATUS_ENUM_TO_KEY[row.status] ?? 'open',
      list: row.createdById === viewerId ? 'created' : 'for-you',
      timeAgo: d.timeAgo ?? relTime(row.createdAt),
      repo: row.repo,
      prNumber: row.prNumber,
      targetBranch: row.targetBranch,
      sourceBranch: row.sourceBranch,
      additions: row.additions,
      deletions: row.deletions,
      resolves: { identifier: row.resolvesIdentifier ?? '', title: d.resolvesTitle ?? '' },
      checksPassed: row.checksPassed,
      checksTotal: row.checksTotal,
      files: d.files ?? [],
      commits: d.commits ?? [],
      summary: d.summary ?? [],
      testPlan: d.testPlan ?? [],
      ...(d.deployment ? { deployment: d.deployment } : {}),
      ...(d.reviewNote ? { reviewNote: d.reviewNote } : {}),
      ...(d.diffs ? { diffs: d.diffs } : {}),
      verdict: (row.verdict as 'approved' | 'changes_requested' | null) ?? null,
      verdictById: row.verdictById,
      createdById: row.createdById,
      createdAt: row.createdAt.toISOString(),
      comments,
   };
}

export interface ReviewCommentDTO {
   id: string;
   authorId: string;
   filePath: string | null;
   body: string;
   createdAt: string;
}

const commentInclude = { orderBy: { createdAt: 'asc' as const } };

/* --------------------------------- reads ---------------------------------- */

export async function listReviews(orgId: string, viewerId: string): Promise<Review[]> {
   const rows = await db.review.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: { comments: commentInclude },
   });
   return rows.map((r) => serialize(r as Row, viewerId, serializeComments(r.comments)));
}

export async function getReview(
   orgId: string,
   id: string,
   viewerId: string
): Promise<(Review & { comments: ReviewCommentDTO[] }) | null> {
   const row = await db.review.findFirst({
      where: { orgId, id },
      include: { comments: commentInclude },
   });
   if (!row) return null;
   return serialize(row as Row, viewerId, serializeComments(row.comments));
}

/** Serialize with the comment thread included (mutation responses). */
async function serializeWithComments(
   row: Row,
   viewerId: string
): Promise<Review & { comments: ReviewCommentDTO[] }> {
   const comments = await db.reviewComment.findMany({
      where: { reviewId: row.id },
      orderBy: { createdAt: 'asc' },
   });
   return serialize(row, viewerId, serializeComments(comments));
}

const serializeComments = (
   rows: { id: string; authorId: string; filePath: string | null; body: string; createdAt: Date }[]
): ReviewCommentDTO[] =>
   rows.map((c) => ({
      id: c.id,
      authorId: c.authorId,
      filePath: c.filePath,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
   }));

/* -------------------------------- writes ---------------------------------- */

export interface CreateReviewBody {
   title: string;
   repo?: string;
   targetBranch?: string;
   sourceBranch?: string;
   resolvesIdentifier?: string | null;
   summary?: string[];
   testPlan?: { text: string; checked: boolean }[];
   diff: string;
}

export async function createReview(
   orgId: string,
   body: CreateReviewBody,
   actorId: string
): Promise<Review> {
   if (!body.title?.trim()) throw new PublicError('title is required');
   const parsed = parseUnifiedDiff(body.diff ?? '');

   let resolvesTitle = '';
   if (body.resolvesIdentifier) {
      const issue = await db.issue.findFirst({
         where: {
            orgId,
            OR: [{ id: body.resolvesIdentifier }, { identifier: body.resolvesIdentifier }],
         },
         select: { title: true },
      });
      if (!issue) throw new PublicError('resolves-issue not found in this workspace');
      resolvesTitle = issue.title;
   }

   const last = await db.review.findFirst({
      where: { orgId },
      orderBy: { prNumber: 'desc' },
      select: { prNumber: true },
   });

   const row = await db.review.create({
      data: {
         orgId,
         title: body.title.trim(),
         status: 'OPEN',
         list: 'CREATED',
         createdById: actorId,
         repo: body.repo?.trim() || 'local',
         prNumber: (last?.prNumber ?? 0) + 1,
         targetBranch: body.targetBranch?.trim() || 'main',
         sourceBranch: body.sourceBranch?.trim() || 'workspace',
         additions: parsed.additions,
         deletions: parsed.deletions,
         resolvesIdentifier: body.resolvesIdentifier?.trim() || null,
         data: {
            files: parsed.files,
            diffs: parsed.diffs,
            summary: body.summary ?? [],
            testPlan: body.testPlan ?? [],
            resolvesTitle,
         } as unknown as Prisma.InputJsonValue,
      },
   });
   return serialize(row as Row, actorId);
}

export async function addReviewComment(
   orgId: string,
   reviewId: string,
   body: { filePath?: string | null; text: string },
   authorId: string
): Promise<ReviewCommentDTO | null> {
   const review = await db.review.findFirst({
      where: { orgId, id: reviewId },
      select: { id: true, title: true, createdById: true },
   });
   if (!review) return null;
   if (!body?.text?.trim()) throw new PublicError('comment text is required');

   const comment = await db.$transaction(async (tx) => {
      const created = await tx.reviewComment.create({
         data: {
            reviewId: review.id,
            authorId,
            filePath: body.filePath ?? null,
            body: body.text.trim().slice(0, 20_000),
         },
      });
      await notifyReview(
         tx,
         review.createdById,
         authorId,
         'comment',
         `commented on your review "${truncate(review.title, 60)}"${body.filePath ? ` (${body.filePath})` : ''}`
      );
      return created;
   });
   return {
      id: comment.id,
      authorId: comment.authorId,
      filePath: comment.filePath,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
   };
}

export async function deleteReviewComment(
   orgId: string,
   reviewId: string,
   commentId: string,
   actor: { userId: string; role: string }
): Promise<boolean> {
   const comment = await db.reviewComment.findFirst({
      where: { id: commentId, reviewId, review: { orgId } },
      select: { id: true, authorId: true },
   });
   if (!comment) return false;
   if (comment.authorId !== actor.userId && actor.role !== 'ADMIN') {
      throw new PublicError('only the author or an admin can delete this comment', 403);
   }
   await db.reviewComment.delete({ where: { id: comment.id } });
   return true;
}

export async function setReviewVerdict(
   orgId: string,
   reviewId: string,
   verdict: 'approved' | 'changes_requested' | null,
   actorId: string
): Promise<Review | null> {
   const review = await db.review.findFirst({
      where: { orgId, id: reviewId },
      select: { id: true, title: true, createdById: true },
   });
   if (!review) return null;

   const row = await db.$transaction(async (tx) => {
      const updated = await tx.review.update({
         where: { id: review.id },
         data: {
            verdict,
            verdictById: verdict ? actorId : null,
            verdictAt: verdict ? new Date() : null,
         },
      });
      if (verdict) {
         await notifyReview(
            tx,
            review.createdById,
            actorId,
            'edited',
            verdict === 'approved'
               ? `approved your review "${truncate(review.title, 60)}"`
               : `requested changes on your review "${truncate(review.title, 60)}"`
         );
      }
      return updated;
   });
   return serializeWithComments(row as Row, actorId);
}

export async function setReviewStatus(
   orgId: string,
   reviewId: string,
   status: 'open' | 'merged' | 'closed',
   actorId: string
): Promise<Review | null> {
   const review = await db.review.findFirst({
      where: { orgId, id: reviewId },
      select: { id: true, title: true, createdById: true },
   });
   if (!review) return null;

   const row = await db.$transaction(async (tx) => {
      const updated = await tx.review.update({
         where: { id: review.id },
         data: {
            status: STATUS_KEY_TO_ENUM[status] ?? 'OPEN',
            ...(status === 'merged'
               ? {
                    verdict: 'approved',
                    verdictById: review.createdById ?? actorId,
                    verdictAt: new Date(),
                 }
               : {}),
         },
      });
      if (review.createdById && review.createdById !== actorId) {
         await notifyReview(
            tx,
            review.createdById,
            actorId,
            'status',
            `marked your review "${truncate(review.title, 60)}" as ${status}`
         );
      }
      return updated;
   });
   return serializeWithComments(row as Row, actorId);
}

export async function deleteReview(orgId: string, reviewId: string): Promise<boolean> {
   const review = await db.review.findFirst({
      where: { orgId, id: reviewId },
      select: { id: true },
   });
   if (!review) return false;
   await db.review.delete({ where: { id: review.id } });
   return true;
}

/* ------------------------------ notifications ------------------------------ */

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Inbox notification to the review creator, gated by their reviewNotifications preference. */
async function notifyReview(
   client: Db,
   creatorId: string | null,
   actorId: string,
   type: string,
   content: string
): Promise<void> {
   if (!creatorId || creatorId === actorId) return;
   const creator = await client.user.findUnique({
      where: { id: creatorId },
      select: { preferences: true },
   });
   const raw = creator?.preferences;
   const pref =
      raw && typeof raw === 'object'
         ? (raw as Record<string, unknown>).reviewNotifications
         : undefined;
   if (pref === false) return;
   await client.notification.create({
      data: { userId: creatorId, actorId, type, content, issueId: null },
   });
   void sendNotificationEmails([creatorId], `Circle: review ${type}`, content);
}
