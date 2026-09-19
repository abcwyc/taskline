import { NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/http';
import { db } from '@/lib/db';
import { registrationOptions } from '@/lib/api/passkeys.server';

export const dynamic = 'force-dynamic';

// POST /api/me/passkeys/options — WebAuthn registration options
export async function POST() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   try {
      const user = await db.user.findUnique({
         where: { id: ctx.userId },
         select: { email: true, name: true },
      });
      if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(await registrationOptions(ctx.userId, user.email, user.name));
   } catch (err) {
      return errorResponse(err);
   }
}
