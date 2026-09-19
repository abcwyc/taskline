import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { folderCreate } from '@/lib/api/schemas';
import { createFolder, listFolders } from '@/lib/api/folders.server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const teamId = req.nextUrl.searchParams.get('teamId') ?? undefined;
   return NextResponse.json(await listFolders(ctx.orgId, teamId));
}

// POST /api/folders   { name, icon?, teamId? }
export async function POST(req: NextRequest) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, folderCreate);
      const created = await createFolder(ctx.orgId, body);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
