import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/http';
import { deleteProjectUpdate } from '@/lib/api/project-details.server';

export const dynamic = 'force-dynamic';

// DELETE /api/projects/:id/updates/:updateId — author or admin
export async function DELETE(
   _req: NextRequest,
   { params }: { params: Promise<{ id: string; updateId: string }> }
) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id, updateId } = await params;

   try {
      const ok = await deleteProjectUpdate(ctx.orgId, id, updateId);
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
