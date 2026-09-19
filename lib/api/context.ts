import 'server-only';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { resolveApiKey } from './api-keys.server';

/**
 * Per-request context (which workspace + who). Route handlers call
 * `requireContext()` and bail early on the returned 401.
 *
 * Today a user belongs to one workspace (the seeded org); when the UI grows a
 * real org switcher, resolve `orgId` from the `[orgId]` route segment and check
 * the membership here.
 */

export interface RequestContext {
   orgId: string;
   userId: string;
   role: 'ADMIN' | 'MEMBER' | 'GUEST' | 'APPLICATION';
}

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export async function getRequestContext(req?: Request): Promise<RequestContext> {
   // Personal API key: Authorization: Bearer circle_… (acts as its creator).
   if (req) {
      const header = req.headers.get('authorization');
      if (header?.startsWith('Bearer ')) {
         const apiKey = await resolveApiKey(header.slice(7).trim());
         if (!apiKey) throw new UnauthorizedError('invalid api key');
         return apiKey;
      }
   }

   const session = await auth();
   const userId = session?.user?.id;
   if (!userId) throw new UnauthorizedError('not authenticated');

   const membership = await db.membership.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: { orgId: true, role: true },
   });
   if (!membership) throw new UnauthorizedError('no workspace membership');

   const user = await db.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true },
   });
   if (!user || user.sessionVersion !== session.user.sessionVersion) {
      throw new UnauthorizedError('session expired');
   }

   return { orgId: membership.orgId, userId, role: membership.role };
}

/** Route-handler helper: returns the context, or a 401 `NextResponse` to return. */
export async function requireContext(req?: Request): Promise<RequestContext | NextResponse> {
   try {
      return await getRequestContext(req);
   } catch (err) {
      if (err instanceof UnauthorizedError) {
         return NextResponse.json({ error: err.message }, { status: 401 });
      }
      throw err;
   }
}

/**
 * Like `requireContext`, but also 403s non-admins. Use in routes that manage the
 * workspace itself (invites, member roles, teams, …).
 */
export async function requireAdmin(): Promise<RequestContext | NextResponse> {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   if (ctx.role !== 'ADMIN') {
      return NextResponse.json({ error: 'admin only' }, { status: 403 });
   }
   return ctx;
}

/**
 * Content mutation guard: ADMIN or MEMBER may write, GUEST / APPLICATION are
 * read-only. Personal actions (own profile, own inbox, own issue subscription,
 * commenting) use plain `requireContext` instead.
 */
export async function requireWrite(): Promise<RequestContext | NextResponse> {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   if (ctx.role !== 'ADMIN' && ctx.role !== 'MEMBER') {
      return NextResponse.json({ error: 'your role is read-only' }, { status: 403 });
   }
   return ctx;
}

export function isContext(v: RequestContext | NextResponse): v is RequestContext {
   return !(v instanceof NextResponse);
}
