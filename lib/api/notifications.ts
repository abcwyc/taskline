import { InboxItem, inboxItems as mockInbox, NotificationType } from '@/mock-data/inbox';
import { users as mockUsers } from '@/mock-data/users';
import { useIssuesStore } from '@/store/issues-store';
import { useMembersStore } from '@/store/members-store';

import { NotificationDTO } from './types';

const BASE = '/api/notifications';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const actor = (id: string | null) =>
   (id && useMembersStore.getState().members.find((u) => u.id === id)) ||
   (id && mockUsers.find((u) => u.id === id)) ||
   mockUsers[0];

/** Merge a notification with the live issue it points at (InboxItem = Issue + fields). */
export function dtoToInboxItem(dto: NotificationDTO): InboxItem | null {
   const issue = dto.issueIdentifier
      ? useIssuesStore.getState().issues.find((i) => i.identifier === dto.issueIdentifier)
      : undefined;
   if (!issue) return null;
   return {
      ...issue,
      id: dto.id,
      content: dto.content,
      type: dto.type as NotificationType,
      user: actor(dto.actorId),
      timestamp: dto.timestamp,
      read: dto.read,
   };
}

export async function fetchNotifications(): Promise<InboxItem[]> {
   const dtos = await http<NotificationDTO[]>(BASE).catch(() => null);
   if (!dtos) return mockInbox;
   return dtos.map(dtoToInboxItem).filter((n): n is InboxItem => n !== null);
}

export async function markNotificationRead(id: string, read: boolean): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ read }),
   });
}

export async function markAllNotificationsRead(): Promise<void> {
   await http<void>(BASE, { method: 'PATCH', body: JSON.stringify({ allRead: true }) });
}
