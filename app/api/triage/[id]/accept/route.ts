import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { acceptTriage } from '@/lib/api/triage.server';

export const dynamic = 'force-dynamic';

// POST /api/triage/:id/accept  -> creates an issue, returns it
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const issue = await acceptTriage(ctx.orgId, id, ctx.userId);
      if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(issue, { status: 201 });
   } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
   }
}
