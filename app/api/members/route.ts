import { NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { listMembers } from '@/lib/api/members.server';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listMembers(ctx.orgId));
}
