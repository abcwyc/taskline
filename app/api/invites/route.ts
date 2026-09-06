import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireAdmin } from '@/lib/api/context';
import { createInvite, listInvites } from '@/lib/api/invites.server';
import { InviteCreateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

/** Public base URL for the invite link: AUTH_URL if set (proxy-safe), else the request origin. */
function inviteOrigin(req: NextRequest): string {
   return process.env.AUTH_URL?.replace(/\/$/, '') || new URL(req.url).origin;
}

// GET /api/invites — pending invites (admin only)
export async function GET(req: NextRequest) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listInvites(ctx.orgId, inviteOrigin(req)));
}

// POST /api/invites  { email?, role? } — create an invite link (admin only)
export async function POST(req: NextRequest) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;

   let body: InviteCreateBody;
   try {
      body = (await req.json()) as InviteCreateBody;
   } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
   }

   try {
      const invite = await createInvite(ctx.orgId, body, ctx.userId, inviteOrigin(req));
      return NextResponse.json(invite, { status: 201 });
   } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
   }
}
