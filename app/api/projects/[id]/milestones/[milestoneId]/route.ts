import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { deleteMilestone, updateMilestone } from '@/lib/api/project-details.server';
import { milestoneUpdate } from '@/lib/api/schemas';

export const dynamic = 'force-dynamic';

// PATCH /api/projects/:id/milestones/:milestoneId   { name?, targetDate?, completed?, order? }
export async function PATCH(
   req: NextRequest,
   { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id, milestoneId } = await params;

   try {
      const body = await parseBody(req, milestoneUpdate);
      const updated = await updateMilestone(ctx.orgId, id, milestoneId, body);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/projects/:id/milestones/:milestoneId
export async function DELETE(
   _req: NextRequest,
   { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id, milestoneId } = await params;

   try {
      const ok = await deleteMilestone(ctx.orgId, id, milestoneId);
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
