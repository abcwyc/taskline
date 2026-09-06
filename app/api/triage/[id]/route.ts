import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { setTriageStatus } from '@/lib/api/triage.server';

export const dynamic = 'force-dynamic';

// PATCH /api/triage/:id   { status: "declined" | "snoozed" }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const body = (await req.json().catch(() => ({}))) as { status?: string };
   if (body.status !== 'declined' && body.status !== 'snoozed') {
      return NextResponse.json({ error: 'status must be declined or snoozed' }, { status: 400 });
   }

   const ok = await setTriageStatus(ctx.orgId, id, body.status);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
