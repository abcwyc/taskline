import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { getMe, updateMe } from '@/lib/api/me.server';
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

   let body: MeUpdateBody;
   try {
      body = (await req.json()) as MeUpdateBody;
   } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
   }

   const me = await updateMe(ctx.userId, body);
   return me ? NextResponse.json(me) : NextResponse.json({ error: 'not found' }, { status: 404 });
}
