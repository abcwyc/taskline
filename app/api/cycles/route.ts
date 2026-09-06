import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { cycleCreate } from '@/lib/api/schemas';
import { createCycle, listCycles } from '@/lib/api/cycles.server';
import { CycleCreateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listCycles(ctx.orgId));
}

export async function POST(req: NextRequest) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;

   let body;
   try {
      body = await parseBody(req, cycleCreate);
   } catch (err) {
      return errorResponse(err);
   }

   try {
      const created = await createCycle(ctx.orgId, body as CycleCreateBody);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
