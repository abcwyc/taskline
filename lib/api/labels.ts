import type { LabelInterface } from '@/mock-data/labels';

import { LabelCreateBody, LabelDTO, LabelUpdateBody } from './types';

const BASE = '/api/labels';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const dtoToLabel = (dto: LabelDTO): LabelInterface => ({
   id: dto.id,
   name: dto.name,
   color: dto.color,
   description: dto.description,
   ...(dto.createdAt ? { createdAt: dto.createdAt } : {}),
});

export const labelPatchToBody = (patch: Partial<LabelInterface>): LabelUpdateBody => ({
   ...(patch.name !== undefined ? { name: patch.name } : {}),
   ...(patch.color !== undefined ? { color: patch.color } : {}),
   ...(patch.description !== undefined ? { description: patch.description } : {}),
});

export async function fetchLabels(): Promise<LabelInterface[]> {
   return (await http<LabelDTO[]>(BASE)).map(dtoToLabel);
}

export async function createLabel(input: LabelCreateBody): Promise<LabelInterface> {
   return dtoToLabel(await http<LabelDTO>(BASE, { method: 'POST', body: JSON.stringify(input) }));
}

export async function updateLabel(id: string, patch: LabelUpdateBody): Promise<LabelInterface> {
   return dtoToLabel(
      await http<LabelDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}

export async function deleteLabel(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
