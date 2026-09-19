import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/http';
import { reviewStatusUpdate, reviewVerdict } from '@/lib/api/schemas';
import {
   deleteReview,
   getReview,
   setReviewStatus,
   setReviewVerdict,
} from '@/lib/api/reviews.server';

export const dynamic = 'force-dynamic';

// GET /api/reviews/:id — full detail incl. comments
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const review = await getReview(ctx.orgId, id, ctx.userId);
   if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(review);
}

// PATCH /api/reviews/:id   { verdict } | { status }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!raw || typeof raw !== 'object') {
         return NextResponse.json({ error: 'expected a JSON body' }, { status: 400 });
      }
      if ('verdict' in raw) {
         const body = reviewVerdict.parse(raw);
         const review = await setReviewVerdict(ctx.orgId, id, body.verdict, ctx.userId);
         if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 });
         return NextResponse.json(review);
      }
      if ('status' in raw) {
         const body = reviewStatusUpdate.parse(raw);
         const review = await setReviewStatus(ctx.orgId, id, body.status, ctx.userId);
         if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 });
         return NextResponse.json(review);
      }
      return NextResponse.json({ error: 'expected verdict or status' }, { status: 400 });
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/reviews/:id — creator or admin semantics live in the server fn
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const ok = await deleteReview(ctx.orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
