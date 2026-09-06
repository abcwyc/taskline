import { AttachmentDTO } from './types';

const forIssue = (idOrIdentifier: string) =>
   `/api/issues/${encodeURIComponent(idOrIdentifier)}/attachments`;

export async function fetchAttachments(idOrIdentifier: string): Promise<AttachmentDTO[]> {
   const res = await fetch(forIssue(idOrIdentifier));
   if (!res.ok) throw new Error(`GET attachments → ${res.status}`);
   return (await res.json()) as AttachmentDTO[];
}

export async function uploadAttachment(idOrIdentifier: string, file: File): Promise<AttachmentDTO> {
   const body = new FormData();
   body.append('file', file);
   const res = await fetch(forIssue(idOrIdentifier), { method: 'POST', body });
   if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error((detail as { error?: string }).error || `upload → ${res.status}`);
   }
   return (await res.json()) as AttachmentDTO;
}

export async function deleteAttachment(id: string): Promise<void> {
   const res = await fetch(`/api/attachments/${encodeURIComponent(id)}`, { method: 'DELETE' });
   if (!res.ok && res.status !== 204) throw new Error(`delete → ${res.status}`);
}
