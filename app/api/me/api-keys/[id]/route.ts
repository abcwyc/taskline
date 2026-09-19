import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { revokeApiKey } from '@/lib/api/api-keys.server';

export const dynamic = 'force-dynamic';

// DELETE /api/me/api-keys/:id — revoke
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const ok = await revokeApiKey(ctx.userId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
