import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { folderUpdate } from '@/lib/api/schemas';
import { deleteFolder, updateFolder } from '@/lib/api/folders.server';

export const dynamic = 'force-dynamic';

// PATCH /api/folders/:id   { name?, icon?, order? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, folderUpdate);
      const updated = await updateFolder(ctx.orgId, id, body);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return errorResponse(err);
   }
}

// DELETE /api/folders/:id — refuses folders that still contain documents
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const result = await deleteFolder(ctx.orgId, id);
      if (result === 'not-empty') {
         return NextResponse.json(
            { error: 'move or delete the documents in this folder first' },
            { status: 409 }
         );
      }
      if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return new NextResponse(null, { status: 204 });
   } catch (err) {
      return errorResponse(err);
   }
}
