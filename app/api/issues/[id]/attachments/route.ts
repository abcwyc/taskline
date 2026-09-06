import { NextRequest, NextResponse } from 'next/server';

import { addAttachment, listAttachments } from '@/lib/api/attachments.server';
import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

// GET /api/issues/:id/attachments
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;
   const rows = await listAttachments(ctx.orgId, id);
   return rows
      ? NextResponse.json(rows)
      : NextResponse.json({ error: 'not found' }, { status: 404 });
}

// POST /api/issues/:id/attachments  (multipart/form-data, field "file")
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   let form: FormData;
   try {
      form = await req.formData();
   } catch {
      return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 });
   }
   const file = form.get('file');
   if (!(file instanceof File)) {
      return NextResponse.json({ error: 'missing "file"' }, { status: 400 });
   }

   try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const dto = await addAttachment(
         ctx.orgId,
         id,
         { name: file.name, type: file.type, bytes },
         ctx.userId
      );
      return dto
         ? NextResponse.json(dto, { status: 201 })
         : NextResponse.json({ error: 'issue not found' }, { status: 404 });
   } catch (err) {
      return errorResponse(err);
   }
}
