import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { createProject, listProjects } from '@/lib/api/projects.server';
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
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;

   let body: unknown;
   try {
      body = await req.json();
   } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
   }
   if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'expected an object' }, { status: 400 });
   }

   try {
      const created = await createProject(orgId, body as ProjectCreateBody);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
   }
}
