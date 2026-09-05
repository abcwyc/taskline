import 'server-only';

import { db } from '@/lib/db';
import { NotificationDTO } from './types';

export async function listNotifications(orgId: string, userId: string): Promise<NotificationDTO[]> {
   const rows = await db.notification.findMany({
      where: { userId, OR: [{ issueId: null }, { issue: { orgId } }] },
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

export async function markAllRead(userId: string): Promise<void> {
   await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
   });
}
