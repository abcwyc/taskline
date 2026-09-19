'use client';

import { TriageItemDTO } from './types';
import { setTriageItemStatus } from './triage';

/** Client-side asks API (user-submitted requests → team intake queues). */

const BASE = '/api/triage';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Submit an ask into a team's intake queue (guests may submit). */
export async function createAsk(input: {
   title: string;
   description: string;
   teamId: string;
}): Promise<TriageItemDTO> {
   return http<TriageItemDTO>(BASE, { method: 'POST', body: JSON.stringify(input) });
}

/** The current user's submissions, any status. */
export async function fetchMyAsks(): Promise<TriageItemDTO[]> {
   return http<TriageItemDTO[]>(`${BASE}?mine=true`);
}

/**
 * Pending requests reported by workspace users (reporterKind === 'user'),
 * across all teams. The endpoint returns every pending triage item; the
 * reporter-kind filter is applied client-side.
 */
export async function fetchCustomerRequests(): Promise<TriageItemDTO[]> {
   const items = await http<TriageItemDTO[]>(BASE);
   return items.filter((item) => item.reporterKind === 'user');
}

/** Decline a pending request (Admin/Member only). */
export async function declineAsk(id: string): Promise<void> {
   await setTriageItemStatus(id, 'declined');
}

/** Snooze a pending request (Admin/Member only). */
export async function snoozeAsk(id: string): Promise<void> {
   await setTriageItemStatus(id, 'snoozed');
}
