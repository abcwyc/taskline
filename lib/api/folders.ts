'use client';

import type { DocumentFolder } from '@/mock-data/documents';

import { dtoToFolder } from './documents';
import { DocumentFolderDTO } from './types';

/** Client-side folders API (document-folder management on team documents). */

const BASE = '/api/folders';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export async function fetchFolders(teamId?: string): Promise<DocumentFolder[]> {
   const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
   return (await http<DocumentFolderDTO[]>(`${BASE}${qs}`)).map(dtoToFolder);
}

export async function createFolder(input: {
   name: string;
   icon?: string;
   teamId?: string | null;
}): Promise<DocumentFolder> {
   return dtoToFolder(
      await http<DocumentFolderDTO>(BASE, { method: 'POST', body: JSON.stringify(input) })
   );
}

export async function updateFolder(
   id: string,
   patch: { name?: string; icon?: string; order?: number }
): Promise<DocumentFolder> {
   return dtoToFolder(
      await http<DocumentFolderDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}

export async function deleteFolder(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
