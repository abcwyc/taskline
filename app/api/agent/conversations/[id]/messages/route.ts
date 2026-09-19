import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { postMessage } from '@/lib/api/agent.server';

export const dynamic = 'force-dynamic';

// POST /api/agent/conversations/:id/messages   { text } — persists the exchange
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   try {
      const body = await parseBody(req, z.object({ text: z.string().trim().min(1).max(20_000) }));
      const exchange = await postMessage(ctx.orgId, ctx.userId, id, body.text);
      return NextResponse.json(exchange, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
