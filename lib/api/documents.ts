import {
   DocumentFolder,
   documentFolders as mockFolders,
   TeamDocument,
} from '@/mock-data/documents';
import { users as mockUsers } from '@/mock-data/users';
import { useMembersStore } from '@/store/members-store';

import { DocumentCreateBody, DocumentDTO, DocumentFolderDTO, DocumentUpdateBody } from './types';

const BASE = '/api/documents';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const creator = (id: string) =>
   useMembersStore.getState().members.find((u) => u.id === id) ??
   mockUsers.find((u) => u.id === id) ??
   mockUsers[0];

const dtoToDoc = (d: DocumentDTO): TeamDocument => ({
   id: d.id,
   name: d.name,
   icon: d.icon,
   creator: creator(d.creatorId),
   createdAt: d.createdAt.slice(0, 10),
   updatedAt: d.updatedAt.slice(0, 10),
   ...(d.pinned ? { pinned: true } : {}),
});

export const dtoToFolder = (f: DocumentFolderDTO): DocumentFolder => ({
   id: f.id,
   name: f.name,
   icon: f.icon,
   documents: f.documents.map(dtoToDoc),
});

export async function fetchDocumentFolders(): Promise<DocumentFolder[]> {
   const dtos = await http<DocumentFolderDTO[]>(BASE).catch(() => null);
   return dtos ? dtos.map(dtoToFolder) : mockFolders;
}

export async function createDocument(input: DocumentCreateBody): Promise<TeamDocument> {
   return dtoToDoc(await http<DocumentDTO>(BASE, { method: 'POST', body: JSON.stringify(input) }));
}

export async function updateDocument(id: string, patch: DocumentUpdateBody): Promise<TeamDocument> {
   return dtoToDoc(
      await http<DocumentDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}

export async function deleteDocument(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
