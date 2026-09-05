import { NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { listTriage } from '@/lib/api/triage.server';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listTriage(ctx.orgId));
}
