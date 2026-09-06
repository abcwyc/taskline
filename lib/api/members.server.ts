import 'server-only';
import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { PublicError } from './http';
import {
   MemberDTO,
   MemberUpdateBody,
   PRESENCE_ENUM_TO_KEY,
   ROLE_ENUM_TO_KEY,
   ROLE_KEY_TO_ENUM,
} from './types';

/**
 * Server-side data access for workspace members (users + their org role +
 * team keys). Mirrors the other *.server.ts modules.
 */

const memberInclude = {
   memberships: { select: { orgId: true, role: true, joinedAt: true } },
   teamMemberships: { select: { team: { select: { key: true, orgId: true } } } },
} satisfies Prisma.UserInclude;
type MemberRow = Prisma.UserGetPayload<{ include: typeof memberInclude }>;

function serializeMember(row: MemberRow, orgId: string): MemberDTO {
   const membership = row.memberships.find((m) => m.orgId === orgId);
   return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatarUrl,
      status: PRESENCE_ENUM_TO_KEY[row.presence] ?? 'offline',
      role: ROLE_ENUM_TO_KEY[membership?.role ?? 'MEMBER'] ?? 'Member',
      joinedDate: (membership?.joinedAt ?? row.createdAt).toISOString().slice(0, 10),
      timezone: row.timezone,
      teamIds: row.teamMemberships.filter((tm) => tm.team.orgId === orgId).map((tm) => tm.team.key),
   };
}

/* --------------------------------- reads -------------------------------- */

export async function listMembers(orgId: string): Promise<MemberDTO[]> {
   const rows = await db.user.findMany({
      where: { memberships: { some: { orgId } } },
      include: memberInclude,
      orderBy: { name: 'asc' },
   });
   return rows.map((r) => serializeMember(r, orgId));
}

export async function getMember(orgId: string, id: string): Promise<MemberDTO | null> {
   const row = await db.user.findFirst({
      where: { id, memberships: { some: { orgId } } },
      include: memberInclude,
   });
   return row ? serializeMember(row, orgId) : null;
}

/* -------------------------------- writes -------------------------------- */

export async function updateMember(
   orgId: string,
   id: string,
   body: MemberUpdateBody
): Promise<MemberDTO | null> {
   const membership = await db.membership.findFirst({
      where: { orgId, userId: id },
      select: { id: true },
   });
   if (!membership) return null;

   if (body.role !== undefined) {
      const role = ROLE_KEY_TO_ENUM[body.role];
      if (role) {
         await db.$transaction(async (tx) => {
            // serialize role changes per org so two concurrent demotions can't
            // both see "2 admins" and leave the workspace with none
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'members:' + orgId}, 0))`;
            const current = await tx.membership.findUnique({
               where: { id: membership.id },
               select: { role: true },
            });
            if (current?.role === 'ADMIN' && role !== 'ADMIN') {
               const admins = await tx.membership.count({ where: { orgId, role: 'ADMIN' } });
               if (admins <= 1) {
                  throw new PublicError('the workspace must keep at least one admin', 409);
               }
            }
            await tx.membership.update({
               where: { id: membership.id },
               data: { role: role as never },
            });
         });
      }
   }
   if (body.name !== undefined || body.timezone !== undefined) {
      await db.user.update({
         where: { id },
         data: {
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
         },
      });
   }

   return getMember(orgId, id);
}
