import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { deleteInitiative, getInitiative, updateInitiative } from '@/lib/api/initiatives.server';
import { InitiativeUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const initiative = await getInitiative(ctx.orgId, id);
   if (!initiative) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(initiative);
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

   try {
      const updated = await updateInitiative(ctx.orgId, id, body as InitiativeUpdateBody);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
   }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const ok = await deleteInitiative(ctx.orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
