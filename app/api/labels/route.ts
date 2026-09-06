import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { labelCreate } from '@/lib/api/schemas';
import { createLabel, listLabels } from '@/lib/api/labels.server';
import { LabelCreateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listLabels(ctx.orgId));
}

export async function POST(req: NextRequest) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, labelCreate);
      const created = await createLabel(ctx.orgId, body as LabelCreateBody);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
