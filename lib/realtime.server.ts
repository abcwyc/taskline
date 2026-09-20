import 'server-only';

/**
 * In-process realtime bus feeding the SSE endpoint (`/api/events`).
 *
 * Scoped to a single server instance on purpose — Circle's supported
 * production shape is a single-instance deployment (see README). If that ever
 * changes, swap this class for Redis pub/sub; publishers and subscribers keep
 * the same interface.
 */

export interface RealtimeEvent {
   resource: 'issue' | 'comment' | 'notification' | 'project' | 'review';
   action: 'created' | 'updated' | 'deleted';
   id?: string;
   at: number;
}

type Listener = (event: RealtimeEvent) => void;

interface Subscription {
   orgId: string;
   fn: Listener;
}

export class RealtimeBus {
   private subscriptions = new Set<Subscription>();

   subscribe(orgId: string, fn: Listener): () => void {
      const subscription: Subscription = { orgId, fn };
      this.subscriptions.add(subscription);
      return () => this.subscriptions.delete(subscription);
   }

   publish(orgId: string, event: Omit<RealtimeEvent, 'at'>): void {
      const payload: RealtimeEvent = { ...event, at: Date.now() };
      for (const sub of this.subscriptions) {
         if (sub.orgId !== orgId) continue;
         try {
            sub.fn(payload);
         } catch {
            // a broken stream must never break the mutation that published
         }
      }
   }

   get subscriberCount(): number {
      return this.subscriptions.size;
   }
}

// Cache on globalThis so Next.js dev hot-reload doesn't fork the bus across
// module instances (publishers and SSE subscribers must share one set).
const globalForBus = globalThis as unknown as { __circleRealtimeBus?: RealtimeBus };
export const realtimeBus: RealtimeBus =
   globalForBus.__circleRealtimeBus ?? (globalForBus.__circleRealtimeBus = new RealtimeBus());
