import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireAdmin } from '@/lib/api/context';
import { getMember, updateMember } from '@/lib/api/members.server';
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

   let body: unknown;
   try {
      body = await req.json();
   } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
   }
   if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'expected an object' }, { status: 400 });
   }

   const updated = await updateMember(ctx.orgId, id, body as MemberUpdateBody);
   if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(updated);
}
