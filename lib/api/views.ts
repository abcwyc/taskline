import { View, views as mockViews, ViewFilter } from '@/mock-data/views';
import { users as mockUsers } from '@/mock-data/users';
import { useMembersStore } from '@/store/members-store';

import { ViewCreateBody, ViewDTO, ViewUpdateBody } from './types';

const BASE = '/api/views';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export function dtoToView(dto: ViewDTO): View {
   const owner =
      useMembersStore.getState().members.find((u) => u.id === dto.ownerId) ??
      mockUsers.find((u) => u.id === dto.ownerId) ??
      mockUsers[0];
   return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      type: dto.type as View['type'],
      owner,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      filter: dto.filter as ViewFilter,
      ...(dto.teamId ? { teamId: dto.teamId } : {}),
   };
}

export const viewPatchToBody = (patch: Partial<View>): ViewUpdateBody => {
   const body: ViewUpdateBody = {};
   if ('name' in patch) body.name = patch.name;
   if ('description' in patch) body.description = patch.description;
   if ('icon' in patch) body.icon = patch.icon;
   if ('type' in patch) body.type = patch.type;
   if ('teamId' in patch) body.teamId = patch.teamId ?? null;
   if ('filter' in patch) body.filter = patch.filter as Record<string, unknown>;
   return body;
};

export async function fetchViews(): Promise<View[]> {
   const dtos = await http<ViewDTO[]>(BASE).catch(() => null);
   return dtos ? dtos.map(dtoToView) : mockViews;
}

export async function createView(input: ViewCreateBody): Promise<View> {
   return dtoToView(await http<ViewDTO>(BASE, { method: 'POST', body: JSON.stringify(input) }));
}

export async function updateView(id: string, patch: ViewUpdateBody): Promise<View> {
   return dtoToView(
      await http<ViewDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}

export async function deleteView(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
