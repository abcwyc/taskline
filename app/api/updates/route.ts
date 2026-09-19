import { NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { listWorkspaceUpdates } from '@/lib/api/project-details.server';

export const dynamic = 'force-dynamic';

// GET /api/updates — the workspace-wide project-updates feed
export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listWorkspaceUpdates(ctx.orgId));
}
