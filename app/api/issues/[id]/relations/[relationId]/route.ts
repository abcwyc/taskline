import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/http';
import { removeIssueRelation } from '@/lib/api/issue-details.server';

export const dynamic = 'force-dynamic';

// DELETE /api/issues/:id/relations/:relationId
export async function DELETE(
   _req: NextRequest,
   { params }: { params: Promise<{ id: string; relationId: string }> }
) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id, relationId } = await params;

   try {
      const ok = await removeIssueRelation(ctx.orgId, id, relationId, ctx.userId);
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
