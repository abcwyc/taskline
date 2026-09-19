import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { addPrLink } from '@/lib/api/issue-details.server';
import { prLinkCreate } from '@/lib/api/schemas';

export const dynamic = 'force-dynamic';

// POST /api/issues/:id/pr-links   { title, url }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, prLinkCreate);
      const link = await addPrLink(ctx.orgId, id, body, ctx.userId);
      if (!link) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(link, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
