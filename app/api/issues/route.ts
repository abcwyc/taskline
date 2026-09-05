import { NextRequest, NextResponse } from 'next/server';

import { getRequestContext } from '@/lib/api/context';
import { createIssue, listIssues } from '@/lib/api/issues.server';
import { IssueCreateBody, ListIssuesQuery } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

// GET /api/issues?cycleId=&projectId=&assigneeId=&statusId=&q=
export async function GET(req: NextRequest) {
   const { orgId } = await getRequestContext();
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
   const { orgId, userId } = await getRequestContext();

   let body: unknown;
   try {
      body = await req.json();
   } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
   }
   if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'expected an object' }, { status: 400 });
   }

   try {
      const created = await createIssue(orgId, body as IssueCreateBody, userId);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
   }
}
