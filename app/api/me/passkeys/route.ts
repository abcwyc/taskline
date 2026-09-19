import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isContext, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { db } from '@/lib/db';
import { verifyRegistration } from '@/lib/api/passkeys.server';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const rows = await db.passkey.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
   });
   return NextResponse.json(
      rows.map((p) => ({
         id: p.id,
         label: p.label,
         createdAt: p.createdAt.toISOString(),
         lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
         backedUp: p.backedUp,
      }))
   );
}

// POST /api/me/passkeys   { label, attestation } — verify + store the credential
export async function POST(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   try {
      const body = await parseBody(
         req,
         z.object({ label: z.string().trim().max(60).optional(), attestation: z.string().min(1) })
      );
      const attestation = JSON.parse(body.attestation) as Parameters<typeof verifyRegistration>[2];
      const created = await verifyRegistration(ctx.userId, body.label ?? 'Passkey', attestation);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err instanceof Error ? err : new Error('registration failed'));
   }
}
