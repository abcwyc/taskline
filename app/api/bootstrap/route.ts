import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { ensureWorkspace } from '@/lib/api/bootstrap';
import { errorResponse, parseBody } from '@/lib/api/http';
import { rateLimit } from '@/lib/api/rate-limit';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const body = z
   .object({
      secret: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8).max(200),
      name: z.string().trim().max(120).optional(),
   })
   .strict();

/**
 * One-time first-admin creation for headless / container deploys.
 *
 *   curl -X POST $URL/api/bootstrap \
 *     -H 'content-type: application/json' \
 *     -d '{"secret":"$BOOTSTRAP_SECRET","email":"you@example.com","password":"..."}'
 *
 * Refuses once the workspace has any members, and requires BOOTSTRAP_SECRET.
 */
export async function POST(req: NextRequest) {
   const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local').trim();
   if (!rateLimit(`bootstrap:${ip}`, { windowMs: 10 * 60_000, max: 10 })) {
      return NextResponse.json({ error: 'too many attempts' }, { status: 429 });
   }

   const secret = process.env.BOOTSTRAP_SECRET?.trim();
   if (!secret) {
      return NextResponse.json({ error: 'BOOTSTRAP_SECRET is not set' }, { status: 403 });
   }

   let input: z.infer<typeof body>;
   try {
      input = await parseBody(req, body);
   } catch (err) {
      return errorResponse(err);
   }
   if (input.secret !== secret) {
      return NextResponse.json({ error: 'bad secret' }, { status: 403 });
   }

   if ((await db.user.count()) > 0) {
      return NextResponse.json({ error: 'workspace already has members' }, { status: 409 });
   }

   const org = await ensureWorkspace();
   const email = input.email.trim().toLowerCase();
   const user = await db.user.create({
      data: {
         email,
         name: input.name?.trim() || email.split('@')[0],
         passwordHash: bcrypt.hashSync(input.password, 10),
         memberships: { create: { orgId: org.id, role: 'ADMIN' } },
      },
      select: { id: true },
   });
   return NextResponse.json({ ok: true, userId: user.id, workspace: org.slug }, { status: 201 });
}
