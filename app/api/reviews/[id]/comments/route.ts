import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { reviewCommentCreate } from '@/lib/api/schemas';
import { addReviewComment } from '@/lib/api/reviews.server';

export const dynamic = 'force-dynamic';

// POST /api/reviews/:id/comments   { filePath?, text } — guests may comment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, reviewCommentCreate);
      const comment = await addReviewComment(ctx.orgId, id, body, ctx.userId);
      if (!comment) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(comment, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
