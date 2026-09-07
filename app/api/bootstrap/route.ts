import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { createFirstAdmin, WorkspaceAlreadyInitializedError } from '@/lib/api/bootstrap';
import { errorResponse, parseBody } from '@/lib/api/http';
import { rateLimit } from '@/lib/api/rate-limit';
import { secretsEqual } from '@/lib/api/secrets';

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
   if (!secretsEqual(input.secret, secret)) {
      return NextResponse.json({ error: 'bad secret' }, { status: 403 });
   }

   const email = input.email.trim().toLowerCase();
   try {
      const { user, org } = await createFirstAdmin({
         email,
         name: input.name?.trim() || email.split('@')[0],
         passwordHash: bcrypt.hashSync(input.password, 10),
      });
      return NextResponse.json({ ok: true, userId: user.id, workspace: org.slug }, { status: 201 });
   } catch (err) {
      if (err instanceof WorkspaceAlreadyInitializedError) {
         return NextResponse.json({ error: err.message }, { status: 409 });
      }
      return errorResponse(err);
   }
}
