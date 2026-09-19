import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireAdmin } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { workflowStateUpdate } from '@/lib/api/schemas';
import { WorkflowStateUpdateBody } from '@/lib/api/types';
import { deleteWorkflowState, updateWorkflowState } from '@/lib/api/workflow-states.server';

export const dynamic = 'force-dynamic';

// PATCH /api/workflow-states/:id (id = status key) — admin only
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, workflowStateUpdate);
      const updated = await updateWorkflowState(ctx.orgId, id, body as WorkflowStateUpdateBody);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/workflow-states/:id — admin only; refuses statuses in use
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const result = await deleteWorkflowState(ctx.orgId, id);
      if (result === 'in-use') {
         return NextResponse.json(
            { error: 'this status is used by issues or projects and cannot be deleted' },
            { status: 409 }
         );
      }
      if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
