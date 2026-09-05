import { NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { listReviews } from '@/lib/api/reviews.server';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listReviews(ctx.orgId));
}
