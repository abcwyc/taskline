import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { search } from '@/lib/api/search.server';

export const dynamic = 'force-dynamic';

// GET /api/search?q=...
export async function GET(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const q = new URL(req.url).searchParams.get('q') ?? '';
   return NextResponse.json(await search(ctx.orgId, q));
}
