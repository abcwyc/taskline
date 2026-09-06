import { NextResponse } from 'next/server';

import { deleteAttachment, getAttachmentBlob } from '@/lib/api/attachments.server';
import { isContext, requireContext } from '@/lib/api/context';

export const dynamic = 'force-dynamic';

// GET /api/attachments/:id — stream the file (auth + same-org only)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const found = await getAttachmentBlob(ctx.orgId, id);
   if (!found) return NextResponse.json({ error: 'not found' }, { status: 404 });

   const { row, bytes } = found;
   // `attachment` (not `inline`): the browser downloads rather than renders, so a
   // user-uploaded .html/.svg can't execute on our origin.
   const asciiName = row.filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
   return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
         'content-type': row.contentType,
         'content-length': String(row.size),
         'content-disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
         'x-content-type-options': 'nosniff',
         'cache-control': 'private, max-age=3600',
      },
   });
}

// DELETE /api/attachments/:id — uploader or an admin
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const { id } = await params;

   const result = await deleteAttachment(ctx.orgId, id, { userId: ctx.userId, role: ctx.role });
   if (result === 'not-found') return NextResponse.json({ error: 'not found' }, { status: 404 });
   if (result === 'forbidden') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
   return new NextResponse(null, { status: 204 });
}
