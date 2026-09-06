import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { createProject, listProjects } from '@/lib/api/projects.server';
import { projectCreate } from '@/lib/api/schemas';
import { ListProjectsQuery, ProjectCreateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

// GET /api/projects?teamId=&initiativeId=&healthId=&statusId=&leadId=&q=
export async function GET(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;
   const sp = req.nextUrl.searchParams;

   const query: ListProjectsQuery = {};
   for (const key of ['teamId', 'initiativeId', 'healthId', 'statusId', 'leadId', 'q'] as const) {
      const value = sp.get(key);
      if (value !== null) query[key] = value;
   }

   return NextResponse.json(await listProjects(orgId, query));
}

// POST /api/projects
export async function POST(req: NextRequest) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, projectCreate);
      const created = await createProject(ctx.orgId, body as ProjectCreateBody);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
