import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { db } from '@/lib/db';
import { verifyTotp } from '@/lib/api/totp';

export const dynamic = 'force-dynamic';

// POST /api/me/mfa/totp/enable   { code } — confirms the pending secret
export async function POST(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   try {
      const body = await parseBody(req, z.object({ code: z.string().regex(/^\d{6}$/) }));
      const user = await db.user.findUnique({
         where: { id: ctx.userId },
         select: { totpSecret: true, mfaEnabled: true },
      });
      if (!user?.totpSecret) {
         return NextResponse.json({ error: 'start setup first' }, { status: 400 });
      }
      if (!verifyTotp(user.totpSecret, body.code)) {
         return NextResponse.json({ error: 'invalid code' }, { status: 422 });
      }
      await db.user.update({ where: { id: ctx.userId }, data: { mfaEnabled: true } });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
