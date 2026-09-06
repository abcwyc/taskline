import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireAdmin } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { teamCreate } from '@/lib/api/schemas';
import { createTeam, listTeams } from '@/lib/api/teams.server';
import { TeamCreateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listTeams(ctx.orgId, ctx.userId));
}

export async function POST(req: NextRequest) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;

   let body;
   try {
      body = await parseBody(req, teamCreate);
   } catch (err) {
      return errorResponse(err);
   }

   try {
      const created = await createTeam(ctx.orgId, body as TeamCreateBody, ctx.userId);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
