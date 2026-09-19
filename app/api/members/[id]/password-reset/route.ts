import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireAdmin } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/http';
import { rateLimit } from '@/lib/api/rate-limit';
import { createOpaqueToken } from '@/lib/api/secrets';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/members/:id/password-reset — admin generates a single-use reset
// link (valid 30 minutes). The URL is returned once; nothing is emailed.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      if (!rateLimit(`pwreset:${ctx.orgId}`, { windowMs: 60 * 60_000, max: 30 })) {
         return NextResponse.json({ error: 'too many resets this hour' }, { status: 429 });
      }
      const member = await db.membership.findFirst({
         where: { orgId: ctx.orgId, userId: id },
         select: { user: { select: { id: true } } },
      });
      if (!member) return NextResponse.json({ error: 'not found' }, { status: 404 });

      const token = createOpaqueToken();
      await db.passwordResetToken.create({
         data: {
            userId: member.user.id,
            token,
            expiresAt: new Date(Date.now() + 30 * 60_000),
         },
      });
      const base = process.env.AUTH_URL || 'http://localhost:3000';
      return NextResponse.json({ url: `${base.replace(/\/$/, '')}/reset-password?token=${token}` });
   } catch (err) {
      return errorResponse(err);
   }
}
