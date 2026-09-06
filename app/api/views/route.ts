import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { viewCreate } from '@/lib/api/schemas';
import { createView, listViews } from '@/lib/api/views.server';
import { ViewCreateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listViews(ctx.orgId));
}

export async function POST(req: NextRequest) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, viewCreate);
      const created = await createView(ctx.orgId, body as ViewCreateBody, ctx.userId);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
