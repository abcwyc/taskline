import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { createConversation, listConversations } from '@/lib/api/agent.server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listConversations(ctx.orgId, ctx.userId));
}

// POST /api/agent/conversations   { title? }
export async function POST(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   try {
      const body = await parseBody(req, z.object({ title: z.string().max(120).optional() }));
      const created = await createConversation(ctx.orgId, ctx.userId, body.title);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
