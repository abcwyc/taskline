import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireAdmin, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { workflowStateCreate } from '@/lib/api/schemas';
import { WorkflowStateCreateBody } from '@/lib/api/types';
import { createWorkflowState, listWorkflowStates } from '@/lib/api/workflow-states.server';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listWorkflowStates(ctx.orgId));
}

// POST /api/workflow-states — admin only
export async function POST(req: NextRequest) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, workflowStateCreate);
      const created = await createWorkflowState(ctx.orgId, body as WorkflowStateCreateBody);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
