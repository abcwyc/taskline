import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { createApiKey, listApiKeys } from '@/lib/api/api-keys.server';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listApiKeys(ctx.userId));
}

// POST /api/me/api-keys   { name } — the full key is returned exactly once
export async function POST(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   try {
      const body = await parseBody(req, z.object({ name: z.string().trim().min(1).max(80) }));
      const created = await createApiKey(ctx.orgId, ctx.userId, body.name);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
