import 'server-only';

import { db } from '@/lib/db';
import { NotificationDTO } from './types';

export async function listNotifications(
   orgId: string,
   userId: string,
   includeSnoozed = false
): Promise<NotificationDTO[]> {
   const now = new Date();
   const rows = await db.notification.findMany({
      where: {
         userId,
         OR: [{ issueId: null }, { issue: { orgId } }],
         ...(includeSnoozed
            ? {}
            : { OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }] }),
      },
      include: { issue: { select: { identifier: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
   });
   return rows.map((n) => ({
      id: n.id,
      type: n.type,
      content: n.content,
      actorId: n.actorId,
      issueIdentifier: n.issue?.identifier ?? null,
      read: n.readAt !== null,
      timestamp: n.createdAt.toISOString(),
   }));
}

export async function markRead(userId: string, id: string, read: boolean): Promise<boolean> {
   const res = await db.notification.updateMany({
      where: { id, userId },
      data: { readAt: read ? new Date() : null },
   });
   return res.count > 0;
}

export async function snoozeNotification(
   userId: string,
   id: string,
   until: Date | null
): Promise<boolean> {
   const res = await db.notification.updateMany({
      where: { id, userId },
      data: { snoozedUntil: until, ...(until ? { readAt: null } : {}) },
   });
   return res.count > 0;
}

export async function markAllRead(userId: string): Promise<void> {
   await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
   });
}

export async function deleteNotification(userId: string, id: string): Promise<boolean> {
   const res = await db.notification.deleteMany({ where: { id, userId } });
   return res.count > 0;
}

/** Delete every notification for the user (Inbox "clear all"). */
export async function deleteAllNotifications(userId: string): Promise<number> {
   const res = await db.notification.deleteMany({ where: { userId } });
   return res.count;
}
