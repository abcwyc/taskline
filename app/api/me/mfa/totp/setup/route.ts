import { NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/http';
import { db } from '@/lib/db';
import { generateTotpSecret, otpauthUrl } from '@/lib/api/totp';

export const dynamic = 'force-dynamic';

// POST /api/me/mfa/totp/setup — generates a pending secret (not enabled yet)
export async function POST() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   try {
      const user = await db.user.findUnique({
         where: { id: ctx.userId },
         select: { email: true, mfaEnabled: true },
      });
      if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });
      if (user.mfaEnabled) {
         return NextResponse.json({ error: 'two-factor is already enabled' }, { status: 409 });
      }
      const secret = generateTotpSecret();
      await db.user.update({
         where: { id: ctx.userId },
         data: { totpSecret: secret, mfaEnabled: false },
      });
      return NextResponse.json({ secret, otpauthUrl: otpauthUrl(secret, user.email) });
   } catch (err) {
      return errorResponse(err);
   }
}
