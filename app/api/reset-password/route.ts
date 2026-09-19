import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { errorResponse, parseBody } from '@/lib/api/http';
import { rateLimit } from '@/lib/api/rate-limit';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/reset-password   { token, password } — public, single use, 30 min.
export async function POST(req: NextRequest) {
   const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local').trim();
   if (!rateLimit(`resetpw:${ip}`, { windowMs: 15 * 60_000, max: 20 })) {
      return NextResponse.json({ error: 'too many attempts' }, { status: 429 });
   }

   try {
      const body = await parseBody(
         req,
         z.object({
            token: z.string().min(20).max(200),
            password: z.string().min(8).max(200),
         })
      );
      const row = await db.passwordResetToken.findUnique({ where: { token: body.token } });
      if (!row || row.usedAt || row.expiresAt < new Date()) {
         return NextResponse.json(
            { error: 'this reset link is invalid or expired' },
            { status: 410 }
         );
      }
      const passwordHash = await bcrypt.hash(body.password, 12);
      await db.$transaction([
         db.passwordResetToken.update({
            where: { id: row.id },
            data: { usedAt: new Date() },
         }),
         db.user.update({
            where: { id: row.userId },
            data: { passwordHash, sessionVersion: { increment: 1 } },
         }),
      ]);
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
