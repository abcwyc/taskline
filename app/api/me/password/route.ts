import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { changePassword } from '@/lib/api/me.server';

export const dynamic = 'force-dynamic';

const passwordChange = z
   .object({
      currentPassword: z.string().min(1).max(200),
      newPassword: z.string().min(8).max(200),
   })
   .strict();

export async function POST(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, passwordChange);
      await changePassword(ctx.userId, body.currentPassword, body.newPassword);
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
