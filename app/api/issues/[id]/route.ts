import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { deleteIssue, getIssue, updateIssue } from '@/lib/api/issues.server';
import { issueUpdate } from '@/lib/api/schemas';
import { IssueUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// GET /api/issues/:id   (id = issue PK or identifier, e.g. LNUI-701)
export async function GET(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;
   const { id } = await params;

   const issue = await getIssue(orgId, id);
   if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(issue);
}

// PATCH /api/issues/:id
export async function PATCH(req: NextRequest, { params }: Params) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, issueUpdate);
      const updated = await updateIssue(ctx.orgId, id, body as IssueUpdateBody, ctx.userId);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/issues/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;
   const { id } = await params;

   const ok = await deleteIssue(orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
