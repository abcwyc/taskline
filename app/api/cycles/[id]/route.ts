import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { cycleUpdate } from '@/lib/api/schemas';
import { deleteCycle, getCycle, updateCycle } from '@/lib/api/cycles.server';
import { CycleUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const cycle = await getCycle(ctx.orgId, id);
   if (!cycle) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(cycle);
}

export async function PATCH(req: NextRequest, { params }: Params) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   let body;
   try {
      body = await parseBody(req, cycleUpdate);
   } catch (err) {
      return errorResponse(err);
   }

   try {
      const updated = await updateCycle(ctx.orgId, id, body as CycleUpdateBody);
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

   const ok = await deleteCycle(ctx.orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
