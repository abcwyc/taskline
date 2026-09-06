import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { initiativeUpdate } from '@/lib/api/schemas';
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
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   let body;
   try {
      body = await parseBody(req, initiativeUpdate);
   } catch (err) {
      return errorResponse(err);
   }

   try {
      const updated = await updateInitiative(ctx.orgId, id, body as InitiativeUpdateBody);
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
   const ok = await deleteInitiative(ctx.orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
