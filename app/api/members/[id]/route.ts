import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireAdmin } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { getMember, removeMember, updateMember } from '@/lib/api/members.server';
import { memberUpdate } from '@/lib/api/schemas';
import { MemberUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const member = await getMember(ctx.orgId, id);
   if (!member) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(member);
}

export async function PATCH(req: NextRequest, { params }: Params) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, memberUpdate);
      const updated = await updateMember(ctx.orgId, id, body as MemberUpdateBody);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return errorResponse(err);
   }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const removed = await removeMember(ctx.orgId, id);
      return removed
         ? new NextResponse(null, { status: 204 })
         : NextResponse.json({ error: 'not found' }, { status: 404 });
   } catch (err) {
      return errorResponse(err);
   }
}
