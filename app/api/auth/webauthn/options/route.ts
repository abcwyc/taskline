import { NextRequest, NextResponse } from 'next/server';

import { authenticationOptions } from '@/lib/api/passkeys.server';
import { rateLimit } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/auth/webauthn/options (?email=) — public, rate-limited.
export async function POST(req: NextRequest) {
   const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local').trim();
   if (!rateLimit(`webauthn-options:${ip}`, { windowMs: 5 * 60_000, max: 50 })) {
      return NextResponse.json({ error: 'too many attempts' }, { status: 429 });
   }
   const email = req.nextUrl.searchParams.get('email') ?? undefined;
   try {
      return NextResponse.json(await authenticationOptions(email || undefined));
   } catch {
      return NextResponse.json({ error: 'could not start passkey sign-in' }, { status: 500 });
   }
}
