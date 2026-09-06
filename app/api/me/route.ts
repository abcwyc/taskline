import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { getMe, updateMe } from '@/lib/api/me.server';
import { meUpdate } from '@/lib/api/schemas';
import { MeUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

// GET /api/me — the signed-in user's profile + preferences
export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const me = await getMe(ctx.userId);
   return me ? NextResponse.json(me) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

// PATCH /api/me — update own name / jobTitle / timezone / preferences
export async function PATCH(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, meUpdate);
      const me = await updateMe(ctx.userId, body as MeUpdateBody);
      return me
         ? NextResponse.json(me)
         : NextResponse.json({ error: 'not found' }, { status: 404 });
   } catch (err) {
      return errorResponse(err);
   }
}
