import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { documentUpdate } from '@/lib/api/schemas';
import { deleteDocument, getDocument, updateDocument } from '@/lib/api/documents.server';
import { DocumentUpdateBody } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const doc = await getDocument(ctx.orgId, id);
   if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json(doc);
}

export async function PATCH(req: NextRequest, { params }: Params) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   try {
      const body = await parseBody(req, documentUpdate);
      const updated = await updateDocument(ctx.orgId, id, body as DocumentUpdateBody);
      if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(updated);
   } catch (err) {
      return errorResponse(err);
   }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const ok = await deleteDocument(ctx.orgId, id);
   if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
