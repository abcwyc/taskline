import { NextRequest, NextResponse } from 'next/server';

import { getRequestContext } from '@/lib/api/context';
import { getProjectDetail } from '@/lib/api/project-details.server';

export const dynamic = 'force-dynamic';

// GET /api/projects/:id/detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const { orgId } = await getRequestContext();
   const { id } = await params;

   const detail = await getProjectDetail(orgId, id);
   if (!detail) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(detail);
}
