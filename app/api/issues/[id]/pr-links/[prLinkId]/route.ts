import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { removePrLink, updatePrLinkStatus } from '@/lib/api/issue-details.server';
import { prLinkUpdate } from '@/lib/api/schemas';

export const dynamic = 'force-dynamic';

// PATCH /api/issues/:id/pr-links/:prLinkId   { status }
export async function PATCH(
   req: NextRequest,
   { params }: { params: Promise<{ id: string; prLinkId: string }> }
) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id, prLinkId } = await params;

   try {
      const body = await parseBody(req, prLinkUpdate);
      const ok = await updatePrLinkStatus(ctx.orgId, id, prLinkId, body.status);
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/issues/:id/pr-links/:prLinkId
export async function DELETE(
   _req: NextRequest,
   { params }: { params: Promise<{ id: string; prLinkId: string }> }
) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id, prLinkId } = await params;

   try {
      const ok = await removePrLink(ctx.orgId, id, prLinkId, ctx.userId);
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
