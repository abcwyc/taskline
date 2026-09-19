import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// DELETE /api/me/passkeys/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const res = await db.passkey.deleteMany({ where: { id, userId: ctx.userId } });
   if (!res.count) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
