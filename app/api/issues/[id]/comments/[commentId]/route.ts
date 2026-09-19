import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { deleteIssueComment, updateIssueComment } from '@/lib/api/issue-details.server';
import { commentUpdate } from '@/lib/api/schemas';

export const dynamic = 'force-dynamic';

// PATCH /api/issues/:id/comments/:commentId   { text } — author or admin
export async function PATCH(
   req: NextRequest,
   { params }: { params: Promise<{ id: string; commentId: string }> }
) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id, commentId } = await params;

   try {
      const body = await parseBody(req, commentUpdate);
      const comment = await updateIssueComment(ctx.orgId, id, commentId, body, {
         userId: ctx.userId,
         role: ctx.role,
      });
      if (!comment) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(comment);
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/issues/:id/comments/:commentId — author or admin
export async function DELETE(
   _req: NextRequest,
   { params }: { params: Promise<{ id: string; commentId: string }> }
) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id, commentId } = await params;

   try {
      const ok = await deleteIssueComment(ctx.orgId, id, commentId, {
         userId: ctx.userId,
         role: ctx.role,
      });
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
