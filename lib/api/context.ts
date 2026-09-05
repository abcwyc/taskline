import 'server-only';

/**
 * Request context (org / current user).
 *
 * TEMPLATE STUB: every API route needs to know which workspace it operates on.
 * Today it returns the seeded demo org. When you wire Auth.js:
 *
 *   import { auth } from '@/lib/auth';
 *   const session = await auth();
 *   if (!session) throw new UnauthorizedError();
 *   // resolve the membership for the `[orgId]` route segment and check it
 *
 * Keep the shape of this module stable — routes only call `getRequestContext()`.
 */

export interface RequestContext {
   orgId: string;
   userId: string | null;
}

const DEMO_ORG = process.env.CIRCLE_DEFAULT_ORG ?? 'org_lndev';

export async function getRequestContext(): Promise<RequestContext> {
   return { orgId: DEMO_ORG, userId: null };
}
