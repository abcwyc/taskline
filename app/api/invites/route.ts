import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireAdmin } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { createInvite, listInvites } from '@/lib/api/invites.server';
import { rateLimit } from '@/lib/api/rate-limit';
import { inviteCreate } from '@/lib/api/schemas';
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

   if (!rateLimit(`invite:${ctx.userId}`, { windowMs: 60 * 60_000, max: 50 })) {
      return NextResponse.json({ error: 'too many invites, slow down' }, { status: 429 });
   }

   try {
      const body = await parseBody(req, inviteCreate);
      const invite = await createInvite(
         ctx.orgId,
         body as InviteCreateBody,
         ctx.userId,
         inviteOrigin(req)
      );
      return NextResponse.json(invite, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
