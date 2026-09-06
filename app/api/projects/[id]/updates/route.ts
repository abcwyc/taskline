import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { addProjectUpdate } from '@/lib/api/project-details.server';
import { PostProjectUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

// POST /api/projects/:id/updates
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { orgId, userId } = ctx;
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
      const created = await addProjectUpdate(orgId, id, body as PostProjectUpdateBody, userId);
      if (!created) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
   }
}
