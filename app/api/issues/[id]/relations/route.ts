import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { addIssueRelation } from '@/lib/api/issue-details.server';
import { relationCreate } from '@/lib/api/schemas';

export const dynamic = 'force-dynamic';

// POST /api/issues/:id/relations   { relatedId, type }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, relationCreate);
      const result = await addIssueRelation(ctx.orgId, id, body, ctx.userId);
      if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(result.relation, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
