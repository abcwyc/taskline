import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { setMilestoneCompleted } from '@/lib/api/project-details.server';

export const dynamic = 'force-dynamic';

// PATCH /api/projects/:id/milestones/:milestoneId   { completed: boolean }
export async function PATCH(
   req: NextRequest,
   { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;
   const { id, milestoneId } = await params;

   let body: { completed?: unknown };
   try {
      body = await req.json();
   } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
   }
   if (typeof body.completed !== 'boolean') {
      return NextResponse.json({ error: 'completed must be a boolean' }, { status: 400 });
   }

   const ok = await setMilestoneCompleted(orgId, id, milestoneId, body.completed);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
