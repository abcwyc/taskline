import { NextRequest, NextResponse } from 'next/server';

import { snapshotCycleBurnup } from '@/lib/api/cycle-burnup.server';
import { errorResponse } from '@/lib/api/http';
import { rateLimit } from '@/lib/api/rate-limit';
import { secretsEqual } from '@/lib/api/secrets';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
   const configured = process.env.CRON_SECRET?.trim();
   if (!configured) {
      return NextResponse.json({ error: 'cycle snapshot job is not configured' }, { status: 503 });
   }

   const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local').trim();
   if (!rateLimit(`cycle-burnup:${ip}`, { windowMs: 60_000, max: 5 })) {
      return NextResponse.json({ error: 'too many attempts' }, { status: 429 });
   }

   const authorization = req.headers.get('authorization') ?? '';
   const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
   if (!secretsEqual(provided, configured)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
   }

   try {
      const cycles = await snapshotCycleBurnup();
      return NextResponse.json({ ok: true, cycles, capturedAt: new Date().toISOString() });
   } catch (err) {
      return errorResponse(err);
   }
}
