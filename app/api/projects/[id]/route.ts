import { NextRequest, NextResponse } from 'next/server';

import { getRequestContext } from '@/lib/api/context';
import { deleteProject, getProject, updateProject } from '@/lib/api/projects.server';
import { ProjectUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id
export async function GET(_req: NextRequest, { params }: Params) {
   const { orgId } = await getRequestContext();
   const { id } = await params;

   const project = await getProject(orgId, id);
   if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(project);
}

// PATCH /api/projects/:id
export async function PATCH(req: NextRequest, { params }: Params) {
   const { orgId } = await getRequestContext();
   const { id } = await params;

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
      const updated = await updateProject(orgId, id, body as ProjectUpdateBody);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
   }
}

// DELETE /api/projects/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
   const { orgId } = await getRequestContext();
   const { id } = await params;

   const ok = await deleteProject(orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
