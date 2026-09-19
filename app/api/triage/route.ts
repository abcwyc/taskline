import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { triageCreate } from '@/lib/api/schemas';
import { createTriageItem, listTriage, listTriageByReporter } from '@/lib/api/triage.server';

export const dynamic = 'force-dynamic';

// GET /api/triage            — the team intake queue (PENDING)
// GET /api/triage?mine=true  — the current user's submitted requests (any status)
export async function GET(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   if (req.nextUrl.searchParams.get('mine') === 'true') {
      return NextResponse.json(await listTriageByReporter(ctx.orgId, ctx.userId));
   }
   return NextResponse.json(await listTriage(ctx.orgId));
}

// POST /api/triage   { title, description, teamId } — submit an ask / request
export async function POST(req: NextRequest) {
   const ctx = await requireContext(); // guests may submit requests
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, triageCreate);
      const created = await createTriageItem(ctx.orgId, body, ctx.userId);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
