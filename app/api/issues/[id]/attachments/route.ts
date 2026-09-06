import { NextRequest, NextResponse } from 'next/server';

import { addAttachment, listAttachments } from '@/lib/api/attachments.server';
import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/http';
import { MAX_ATTACHMENT_BYTES } from '@/lib/api/storage';

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

   // Reject oversized uploads from the header before reading the body into memory.
   // (multipart framing adds a little overhead, hence the * 1.1 slack.)
   const declared = Number(req.headers.get('content-length') ?? 0);
   if (declared > MAX_ATTACHMENT_BYTES * 1.1) {
      return NextResponse.json(
         { error: `file is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB` },
         { status: 413 }
      );
   }

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
