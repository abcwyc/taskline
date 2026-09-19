import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import {
   deleteAllNotifications,
   listNotifications,
   markAllRead,
} from '@/lib/api/notifications.server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const includeSnoozed = req.nextUrl.searchParams.get('includeSnoozed') === 'true';
   return NextResponse.json(await listNotifications(ctx.orgId, ctx.userId, includeSnoozed));
}

// PATCH /api/notifications  { allRead: true }
export async function PATCH(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;

   const body = (await req.json().catch(() => ({}))) as { allRead?: unknown };
   if (body.allRead === true) await markAllRead(ctx.userId);
   return new NextResponse(null, { status: 204 });
}

// DELETE /api/notifications — clear the whole inbox
export async function DELETE() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   await deleteAllNotifications(ctx.userId);
   return new NextResponse(null, { status: 204 });
}
