import 'server-only';

import { db } from '@/lib/db';
import type { Review } from '@/mock-data/reviews';

/** Server-side reads for the review surface (read-only until a real VCS integration). */

const STATUS: Record<string, Review['status']> = {
   OPEN: 'open',
   MERGED: 'merged',
   CLOSED: 'closed',
};

type Row = Awaited<ReturnType<typeof db.review.findMany>>[number];

function serialize(row: Row): Review {
   const d = (row.data ?? {}) as {
      timeAgo?: string;
      resolvesTitle?: string;
      files?: Review['files'];
      commits?: Review['commits'];
      summary?: string[];
      testPlan?: Review['testPlan'];
      deployment?: Review['deployment'] | null;
      reviewNote?: Review['reviewNote'] | null;
   };
   return {
      id: row.id,
      title: row.title,
      status: STATUS[row.status] ?? 'open',
      list: row.list === 'FOR_YOU' ? 'for-you' : 'created',
      timeAgo: d.timeAgo ?? '',
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
   };
}

export async function listReviews(orgId: string): Promise<Review[]> {
   const rows = await db.review.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
   return rows.map(serialize);
}
