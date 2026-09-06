import { InviteCreateBody, InviteDTO } from './types';

const BASE = '/api/invites';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export function fetchInvites(): Promise<InviteDTO[]> {
   return http<InviteDTO[]>(BASE);
}

export function createInvite(input: InviteCreateBody): Promise<InviteDTO> {
   return http<InviteDTO>(BASE, { method: 'POST', body: JSON.stringify(input) });
}

export function revokeInvite(id: string): Promise<void> {
   return http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
