import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { createIssue, listIssues } from '@/lib/api/issues.server';
import { issueCreate } from '@/lib/api/schemas';
import { IssueCreateBody, ListIssuesQuery } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

// GET /api/issues?cycleId=&projectId=&assigneeId=&statusId=&q=
export async function GET(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;
   const sp = req.nextUrl.searchParams;

   const query: ListIssuesQuery = {};
   for (const key of ['cycleId', 'projectId', 'assigneeId', 'statusId', 'q'] as const) {
      const value = sp.get(key);
      if (value !== null) query[key] = value;
   }

   const issues = await listIssues(orgId, query);
   return NextResponse.json(issues);
}

// POST /api/issues
export async function POST(req: NextRequest) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, issueCreate);
      const created = await createIssue(ctx.orgId, body as IssueCreateBody, ctx.userId);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
