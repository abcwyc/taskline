import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { markRead } from '@/lib/api/notifications.server';

export const dynamic = 'force-dynamic';

// PATCH /api/notifications/:id  { read: boolean }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const body = (await req.json().catch(() => ({}))) as { read?: unknown };
   const ok = await markRead(ctx.userId, id, body.read !== false);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
