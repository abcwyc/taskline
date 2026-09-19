import { NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/me/sessions/revoke-all — bumps sessionVersion; every JWT session
// (including this one) is rejected afterwards.
export async function POST() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { sessionVersion: true },
   });
   await db.user.update({
      where: { id: ctx.userId },
      data: { sessionVersion: (user?.sessionVersion ?? 0) + 1 },
   });
   return new NextResponse(null, { status: 204 });
}
