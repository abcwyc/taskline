import { NextResponse } from 'next/server';

import { isContext, requireAdmin } from '@/lib/api/context';
import { revokeInvite } from '@/lib/api/invites.server';

export const dynamic = 'force-dynamic';

// DELETE /api/invites/:id — revoke a pending invite (admin only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const ok = await revokeInvite(ctx.orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
