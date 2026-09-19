import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { milestoneCreate } from '@/lib/api/schemas';
import { createMilestone } from '@/lib/api/project-details.server';

export const dynamic = 'force-dynamic';

// POST /api/projects/:id/milestones   { name, targetDate? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, milestoneCreate);
      const created = await createMilestone(ctx.orgId, id, body);
      if (!created) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
