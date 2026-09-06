import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { addIssueComment } from '@/lib/api/issue-details.server';
import { commentCreate } from '@/lib/api/schemas';

export const dynamic = 'force-dynamic';

// POST /api/issues/:id/comments   { text }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, commentCreate);
      const comment = await addIssueComment(ctx.orgId, id, body, ctx.userId);
      if (!comment) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(comment, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
