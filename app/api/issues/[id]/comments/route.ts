import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { addIssueComment } from '@/lib/api/issue-details.server';
import { PostCommentBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

// POST /api/issues/:id/comments   { text }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

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
      const comment = await addIssueComment(ctx.orgId, id, body as PostCommentBody, ctx.userId);
      if (!comment) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(comment, { status: 201 });
   } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
   }
}
