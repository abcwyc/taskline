import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireAdmin } from '@/lib/api/context';
import { errorResponse, parseBody, PublicError } from '@/lib/api/http';
import { teamUpdate } from '@/lib/api/schemas';
import { deleteTeam, getTeam, updateTeam } from '@/lib/api/teams.server';
import { TeamUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const team = await getTeam(ctx.orgId, id, ctx.userId);
   if (!team) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(team);
}

export async function PATCH(req: NextRequest, { params }: Params) {
   // members may only toggle their own membership; renaming / restyling a team
   // (name / icon / color) is an admin action.
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   let body;
   try {
      body = await parseBody(req, teamUpdate);
   } catch (err) {
      return errorResponse(err);
   }

   const wantsProfileEdit =
      body.name !== undefined || body.icon !== undefined || body.color !== undefined;
   if (wantsProfileEdit && ctx.role !== 'ADMIN') {
      return errorResponse(new PublicError('only an admin can edit team details', 403));
   }
   if (!wantsProfileEdit && ctx.role !== 'ADMIN' && ctx.role !== 'MEMBER') {
      return errorResponse(new PublicError('your role is read-only', 403));
   }

   try {
      const updated = await updateTeam(ctx.orgId, id, body as TeamUpdateBody, ctx.userId);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return errorResponse(err);
   }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const ok = await deleteTeam(ctx.orgId, id);
      if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
