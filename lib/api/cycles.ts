import { Cycle, cycles as mockCycles } from '@/mock-data/cycles';

import { CycleCreateBody, CycleDTO, CycleUpdateBody } from './types';

const BASE = '/api/cycles';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export function dtoToCycle(dto: CycleDTO): Cycle {
   return {
      id: dto.id,
      number: dto.number,
      name: dto.name,
      teamId: dto.teamId,
      status: dto.status as Cycle['status'],
      startDate: dto.startDate,
      endDate: dto.endDate,
      capacity: dto.capacity,
      scope: dto.scope,
      scopeDelta: dto.scopeDelta,
      started: dto.started,
      completed: dto.completed,
      ...(dto.successRate != null ? { successRate: dto.successRate } : {}),
      ...(dto.burnup ? { burnup: dto.burnup } : {}),
   };
}

export function cyclePatchToBody(patch: Partial<Cycle>): CycleUpdateBody {
   const body: CycleUpdateBody = {};
   if ('name' in patch) body.name = patch.name;
   if ('status' in patch) body.status = patch.status;
   if ('startDate' in patch) body.startDate = patch.startDate;
   if ('endDate' in patch) body.endDate = patch.endDate;
   if ('capacity' in patch) body.capacity = patch.capacity;
   if ('teamId' in patch) body.teamId = patch.teamId;
   return body;
}

export async function fetchCycles(): Promise<Cycle[]> {
   const dtos = await http<CycleDTO[]>(BASE).catch(() => null);
   return dtos ? dtos.map(dtoToCycle) : mockCycles;
}

export async function createCycle(input: CycleCreateBody): Promise<Cycle> {
   return dtoToCycle(await http<CycleDTO>(BASE, { method: 'POST', body: JSON.stringify(input) }));
}

export async function updateCycle(id: string, patch: CycleUpdateBody): Promise<Cycle> {
   return dtoToCycle(
      await http<CycleDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}

export async function deleteCycle(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
