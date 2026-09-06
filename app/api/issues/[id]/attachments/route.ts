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

const OVER_LIMIT = () =>
   NextResponse.json(
      { error: `file is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB` },
      { status: 413 }
   );

/**
 * POST /api/issues/:id/attachments — the file is the raw request body.
 * Headers: `Content-Type` = the file's mime type, `X-Filename` = its name.
 * The body is read as a stream and aborted the moment it exceeds the limit, so
 * a client can't force us to buffer an arbitrarily large payload.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const declared = Number(req.headers.get('content-length') ?? 0);
   if (declared > MAX_ATTACHMENT_BYTES) return OVER_LIMIT();
   if (!req.body) return NextResponse.json({ error: 'empty body' }, { status: 400 });

   let filename = 'file';
   try {
      filename = decodeURIComponent(req.headers.get('x-filename') ?? 'file').slice(0, 255);
   } catch {
      /* keep default */
   }
   const type = req.headers.get('content-type') || 'application/octet-stream';

   const chunks: Uint8Array[] = [];
   let total = 0;
   const reader = req.body.getReader();
   try {
      for (;;) {
         const { done, value } = await reader.read();
         if (done) break;
         total += value.byteLength;
         if (total > MAX_ATTACHMENT_BYTES) {
            await reader.cancel();
            return OVER_LIMIT();
         }
         chunks.push(value);
      }
   } catch {
      return NextResponse.json({ error: 'upload interrupted' }, { status: 400 });
   }

   try {
      const bytes = Buffer.concat(chunks);
      const dto = await addAttachment(ctx.orgId, id, { name: filename, type, bytes }, ctx.userId);
      return dto
         ? NextResponse.json(dto, { status: 201 })
         : NextResponse.json({ error: 'issue not found' }, { status: 404 });
   } catch (err) {
      return errorResponse(err);
   }
}
