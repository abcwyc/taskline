import 'server-only';

import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { PublicError } from './http';
import { normalizePreferences } from './preferences';
import { MeDTO, MeUpdateBody, ROLE_ENUM_TO_KEY } from './types';

/** The signed-in user's own profile + preferences. */
export async function getMe(userId: string): Promise<MeDTO | null> {
   const row = await db.user.findUnique({
      where: { id: userId },
      include: { memberships: { orderBy: { joinedAt: 'asc' }, take: 1, select: { role: true } } },
   });
   if (!row) return null;
   return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatarUrl,
      jobTitle: row.jobTitle,
      timezone: row.timezone,
      role: ROLE_ENUM_TO_KEY[row.memberships[0]?.role ?? 'MEMBER'] ?? 'Member',
      preferences: normalizePreferences(row.preferences),
   };
}

export async function updateMe(userId: string, body: MeUpdateBody): Promise<MeDTO | null> {
   const current = await db.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
   });
   if (!current) return null;

   const data: Record<string, unknown> = {};
   if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
   if (body.jobTitle !== undefined) data.jobTitle = body.jobTitle?.trim() || null;
   if (typeof body.timezone === 'string' && body.timezone) data.timezone = body.timezone;
   if (body.preferences) {
      data.preferences = normalizePreferences({
         ...normalizePreferences(current.preferences),
         ...body.preferences,
      });
   }

   if (Object.keys(data).length) {
      await db.user.update({ where: { id: userId }, data });
   }
   return getMe(userId);
}

export async function changePassword(
   userId: string,
   currentPassword: string,
   nextPassword: string
): Promise<void> {
   const user = await db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
   });
   if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new PublicError('current password is incorrect', 403);
   }

   await db.user.update({
      where: { id: userId },
      data: {
         passwordHash: await bcrypt.hash(nextPassword, 12),
         sessionVersion: { increment: 1 },
      },
   });
}
