import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/me/mfa/totp/disable   { password } — requires the account password
export async function POST(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   try {
      const body = await parseBody(req, z.object({ password: z.string().min(1).max(200) }));
      const user = await db.user.findUnique({
         where: { id: ctx.userId },
         select: { passwordHash: true },
      });
      if (!user?.passwordHash || !(await bcrypt.compare(body.password, user.passwordHash))) {
         return NextResponse.json({ error: 'wrong password' }, { status: 403 });
      }
      await db.user.update({
         where: { id: ctx.userId },
         data: { totpSecret: null, mfaEnabled: false },
      });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
