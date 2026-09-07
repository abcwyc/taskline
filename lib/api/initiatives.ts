import type { Initiative } from '@/mock-data/initiatives';
import { health as healthRegistry } from '@/mock-data/projects';
import { priorities } from '@/mock-data/priorities';
import { useMembersStore } from '@/store/members-store';

import { InitiativeCreateBody, InitiativeDTO, InitiativeUpdateBody } from './types';

const BASE = '/api/initiatives';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const fallbackPriority = priorities.find((p) => p.id === 'no-priority') ?? priorities[0];
const fallbackHealth = healthRegistry.find((h) => h.id === 'no-update') ?? healthRegistry[0];

export function dtoToInitiative(dto: InitiativeDTO): Initiative {
   const owner =
      dto.ownerId && useMembersStore.getState().members.find((u) => u.id === dto.ownerId);
   return {
      id: dto.id,
      name: dto.name,
      icon: dto.icon,
      status: dto.status as Initiative['status'],
      priority: priorities.find((p) => p.id === dto.priorityId) ?? fallbackPriority,
      health: healthRegistry.find((h) => h.id === dto.healthId) ?? fallbackHealth,
      projectIds: dto.projectIds,
      createdAt: dto.createdAt,
      ...(dto.description ? { description: dto.description } : {}),
      ...(owner ? { owner } : {}),
      ...(dto.leadTeamId ? { leadTeamId: dto.leadTeamId } : {}),
      ...(dto.target ? { target: dto.target } : {}),
   };
}

export function initiativePatchToBody(patch: Partial<Initiative>): InitiativeUpdateBody {
   const body: InitiativeUpdateBody = {};
   if ('name' in patch) body.name = patch.name;
   if ('description' in patch) body.description = patch.description ?? null;
   if ('icon' in patch) body.icon = patch.icon;
   if ('status' in patch) body.status = patch.status;
   if ('priority' in patch && patch.priority) body.priorityId = patch.priority.id;
   if ('health' in patch && patch.health) body.healthId = patch.health.id;
   if ('owner' in patch) body.ownerId = patch.owner?.id ?? null;
   if ('leadTeamId' in patch) body.leadTeamId = patch.leadTeamId ?? null;
   if ('target' in patch) body.target = patch.target ?? null;
   if ('projectIds' in patch) body.projectIds = patch.projectIds;
   return body;
}

export async function fetchInitiatives(): Promise<Initiative[]> {
   return (await http<InitiativeDTO[]>(BASE)).map(dtoToInitiative);
}

export async function createInitiative(input: InitiativeCreateBody): Promise<Initiative> {
   return dtoToInitiative(
      await http<InitiativeDTO>(BASE, { method: 'POST', body: JSON.stringify(input) })
   );
}

export async function updateInitiative(
   id: string,
   patch: InitiativeUpdateBody
): Promise<Initiative> {
   return dtoToInitiative(
      await http<InitiativeDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}

export async function deleteInitiative(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
