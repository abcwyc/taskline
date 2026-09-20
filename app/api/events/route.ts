import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import { realtimeBus } from '@/lib/realtime.server';

export const dynamic = 'force-dynamic';

// Heartbeat keeps proxies from closing an idle stream; below it, comments are
// ignored by EventSource.
const PING_INTERVAL_MS = 25_000;

/**
 * GET /api/events — server-sent events carrying workspace change pings.
 *
 * The payload is a hint ("something changed"), never the data itself: clients
 * re-hydrate through the normal REST endpoints, so no extra authorization
 * surface exists beyond the org scoping of the subscription.
 */
export async function GET(req: NextRequest) {
   const ctx = await requireContext(req);
   if (!isContext(ctx)) return ctx;
   const { orgId } = ctx;

   let unsubscribe: () => void = () => {};
   let ping: ReturnType<typeof setInterval> | undefined;

   const stream = new ReadableStream<Uint8Array>({
      start(controller) {
         const encoder = new TextEncoder();
         const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

         send('retry: 3000\n\n');
         send('event: ready\ndata: {}\n\n');

         unsubscribe = realtimeBus.subscribe(orgId, (event) => {
            try {
               send(`event: change\ndata: ${JSON.stringify(event)}\n\n`);
            } catch {
               // stream already closing; the abort handler cleans up
            }
         });

         ping = setInterval(() => {
            try {
               send(': ping\n\n');
            } catch {
               // ditto
            }
         }, PING_INTERVAL_MS);

         req.signal.addEventListener('abort', () => {
            if (ping !== undefined) clearInterval(ping);
            unsubscribe();
            try {
               controller.close();
            } catch {
               // already closed
            }
         });
      },
      cancel() {
         if (ping !== undefined) clearInterval(ping);
         unsubscribe();
      },
   });

   return new NextResponse(stream, {
      headers: {
         'content-type': 'text/event-stream; charset=utf-8',
         'cache-control': 'no-cache, no-transform',
         'connection': 'keep-alive',
         'x-accel-buffering': 'no', // disable nginx buffering in proxied deploys
      },
   });
}
