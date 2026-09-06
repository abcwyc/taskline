import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { viewUpdate } from '@/lib/api/schemas';
import { deleteView, getView, updateView } from '@/lib/api/views.server';
import { ViewUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const view = await getView(ctx.orgId, id);
   if (!view) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(view);
}

export async function PATCH(req: NextRequest, { params }: Params) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, viewUpdate);
      const updated = await updateView(ctx.orgId, id, body as ViewUpdateBody);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return errorResponse(err);
   }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const ok = await deleteView(ctx.orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
