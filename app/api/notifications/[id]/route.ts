import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { deleteNotification, markRead, snoozeNotification } from '@/lib/api/notifications.server';
import { notificationUpdate } from '@/lib/api/schemas';

export const dynamic = 'force-dynamic';

// PATCH /api/notifications/:id  { read?, snoozedUntil? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, notificationUpdate);
      let ok = true;
      if (body.read !== undefined) ok = (await markRead(ctx.userId, id, body.read)) && ok;
      if (body.snoozedUntil !== undefined) {
         ok =
            (await snoozeNotification(
               ctx.userId,
               id,
               body.snoozedUntil ? new Date(body.snoozedUntil) : null
            )) && ok;
      }
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/notifications/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const ok = await deleteNotification(ctx.userId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
