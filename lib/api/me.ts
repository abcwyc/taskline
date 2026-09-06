import { MeDTO, MeUpdateBody } from './types';

const BASE = '/api/me';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return (await res.json()) as T;
}

export function fetchMe(): Promise<MeDTO> {
   return http<MeDTO>(BASE);
}

export function updateMe(body: MeUpdateBody): Promise<MeDTO> {
   return http<MeDTO>(BASE, { method: 'PATCH', body: JSON.stringify(body) });
}
