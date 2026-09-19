import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/http';
import { deleteReviewComment } from '@/lib/api/reviews.server';

export const dynamic = 'force-dynamic';

// DELETE /api/reviews/:id/comments/:commentId — author or admin
export async function DELETE(
   _req: NextRequest,
   { params }: { params: Promise<{ id: string; commentId: string }> }
) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id, commentId } = await params;

   try {
      const ok = await deleteReviewComment(ctx.orgId, id, commentId, {
         userId: ctx.userId,
         role: ctx.role,
      });
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
