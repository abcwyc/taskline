'use client';

import { IssueTemplateDTO } from './types';

/** Client-side issue-templates API (settings CRUD + new-issue prefills). */

const BASE = '/api/issue-templates';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export async function fetchIssueTemplates(): Promise<IssueTemplateDTO[]> {
   return http<IssueTemplateDTO[]>(BASE);
}

export async function createIssueTemplate(
   body: Partial<Omit<IssueTemplateDTO, 'id'>>
): Promise<IssueTemplateDTO> {
   return http<IssueTemplateDTO>(BASE, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateIssueTemplate(
   id: string,
   patch: Partial<Omit<IssueTemplateDTO, 'id'>>
): Promise<IssueTemplateDTO> {
   return http<IssueTemplateDTO>(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
   });
}

export async function deleteIssueTemplate(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
