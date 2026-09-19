import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { deleteConversation, getMessages, renameConversation } from '@/lib/api/agent.server';

export const dynamic = 'force-dynamic';

// GET /api/agent/conversations/:id — title + messages
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const data = await getMessages(ctx.orgId, ctx.userId, id);
   if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(data);
}

// PATCH /api/agent/conversations/:id   { title }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   try {
      const body = await parseBody(req, z.object({ title: z.string().min(1).max(120) }));
      const ok = await renameConversation(ctx.orgId, ctx.userId, id, body.title);
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/agent/conversations/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const ok = await deleteConversation(ctx.orgId, ctx.userId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
