import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { projectUpdate } from '@/lib/api/schemas';
import { deleteProject, getProject, updateProject } from '@/lib/api/projects.server';
import { ProjectUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id
export async function GET(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;
   const { id } = await params;

   const project = await getProject(orgId, id);
   if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(project);
}

// PATCH /api/projects/:id
export async function PATCH(req: NextRequest, { params }: Params) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;
   const { id } = await params;

   let body;
   try {
      body = await parseBody(req, projectUpdate);
   } catch (err) {
      return errorResponse(err);
   }

   try {
      const updated = await updateProject(orgId, id, body as ProjectUpdateBody);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/projects/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;
   const { id } = await params;

   const ok = await deleteProject(orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
