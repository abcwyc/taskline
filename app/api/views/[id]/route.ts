import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
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
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   let body: unknown;
   try {
      body = await req.json();
   } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
   }
   if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'expected an object' }, { status: 400 });
   }

   const updated = await updateView(ctx.orgId, id, body as ViewUpdateBody);
   if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const ok = await deleteView(ctx.orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
