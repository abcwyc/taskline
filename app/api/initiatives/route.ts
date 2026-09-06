import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { initiativeCreate } from '@/lib/api/schemas';
import { createInitiative, listInitiatives } from '@/lib/api/initiatives.server';
import { InitiativeCreateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listInitiatives(ctx.orgId));
}

export async function POST(req: NextRequest) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;

   let body;
   try {
      body = await parseBody(req, initiativeCreate);
   } catch (err) {
      return errorResponse(err);
   }

   try {
      const created = await createInitiative(ctx.orgId, body as InitiativeCreateBody);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
