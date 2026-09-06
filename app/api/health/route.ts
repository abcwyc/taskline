import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Liveness + readiness probe. 200 only when the process is up AND the database
 * answers. Point your load balancer / `docker healthcheck` here.
 */
export async function GET() {
   try {
      await db.$queryRaw`SELECT 1`;
      return NextResponse.json({ status: 'ok', db: 'up' });
   } catch {
      return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 });
   }
}
