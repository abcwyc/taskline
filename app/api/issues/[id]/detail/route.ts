import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { getIssueDetail } from '@/lib/api/issue-details.server';

export const dynamic = 'force-dynamic';

// GET /api/issues/:id/detail   (id = issue PK or identifier)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const detail = await getIssueDetail(ctx.orgId, id);
   if (!detail) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(detail);
}
