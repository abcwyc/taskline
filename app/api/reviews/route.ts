import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { reviewCreate } from '@/lib/api/schemas';
import { createReview, listReviews } from '@/lib/api/reviews.server';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listReviews(ctx.orgId, ctx.userId));
}

// POST /api/reviews   { title, repo?, branches?, resolvesIdentifier?, summary?, testPlan?, diff }
export async function POST(req: NextRequest) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, reviewCreate);
      const created = await createReview(ctx.orgId, body, ctx.userId);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
