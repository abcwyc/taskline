import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { listNotifications, markAllRead } from '@/lib/api/notifications.server';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listNotifications(ctx.orgId, ctx.userId));
}

// PATCH /api/notifications  { allRead: true }
export async function PATCH(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;

   const body = (await req.json().catch(() => ({}))) as { allRead?: unknown };
   if (body.allRead === true) await markAllRead(ctx.userId);
   return new NextResponse(null, { status: 204 });
}
