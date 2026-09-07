import 'server-only';

import { db } from '@/lib/db';
import { InviteCreateBody, InviteDTO, ROLE_ENUM_TO_KEY, ROLE_KEY_TO_ENUM } from './types';
import { PublicError } from './http';
import { createOpaqueToken } from './secrets';

/**
 * Workspace invitations. An invite is a single-use token redeemed at
 * `/sign-up?invite=<token>` (see `signUpAction`). `email == null` means an open
 * link anyone can use once; a set email locks redemption to that address.
 */

const INVITE_TTL_DAYS = 14;
type Role = 'ADMIN' | 'MEMBER' | 'GUEST' | 'APPLICATION';

const inviteInclude = { invitedBy: { select: { name: true } } } as const;

interface InviteRow {
   id: string;
   email: string | null;
   role: Role;
   token: string;
   expiresAt: Date;
   createdAt: Date;
   invitedBy: { name: string } | null;
}

function serialize(row: InviteRow, origin: string): InviteDTO {
   return {
      id: row.id,
      email: row.email,
      role: ROLE_ENUM_TO_KEY[row.role] ?? 'Member',
      token: row.token,
      url: `${origin}/sign-up?invite=${encodeURIComponent(row.token)}`,
      invitedByName: row.invitedBy?.name ?? null,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
   };
}

/* --------------------------------- reads -------------------------------- */

/** Pending (not yet redeemed, not expired) invites for the workspace. */
export async function listInvites(orgId: string, origin: string): Promise<InviteDTO[]> {
   const rows = await db.invite.findMany({
      where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: inviteInclude,
      orderBy: { createdAt: 'desc' },
   });
   return rows.map((r) => serialize(r, origin));
}

/**
 * Resolve a token for the sign-up screen. Returns `null` for anything not
 * redeemable (unknown / expired / already used).
 */
export async function getInviteByToken(token: string) {
   const row = await db.invite.findUnique({
      where: { token },
      include: { org: { select: { id: true, name: true, slug: true } } },
   });
   if (!row || row.acceptedAt || row.expiresAt < new Date()) return null;
   return {
      orgId: row.org.id,
      orgName: row.org.name,
      email: row.email,
      role: row.role as Role,
   };
}

/* -------------------------------- writes -------------------------------- */

export async function createInvite(
   orgId: string,
   body: InviteCreateBody,
   invitedById: string,
   origin: string
): Promise<InviteDTO> {
   const email = body.email?.trim().toLowerCase() || null;
   // Invites only grant Member or Guest; promote to Admin after they join.
   const role = (ROLE_KEY_TO_ENUM[body.role ?? 'Member'] ?? 'MEMBER') as Role;
   const safeRole: Role = role === 'GUEST' ? 'GUEST' : 'MEMBER';

   if (email) {
      const existing = await db.user.findFirst({
         where: { email, memberships: { some: { orgId } } },
         select: { id: true },
      });
      if (existing) throw new PublicError('that email is already a member');
   }

   const row = await db.invite.create({
      data: {
         orgId,
         email,
         role: safeRole,
         token: createOpaqueToken(),
         invitedById,
         expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
      },
      include: inviteInclude,
   });
   return serialize(row, origin);
}

export async function revokeInvite(orgId: string, id: string): Promise<boolean> {
   const existing = await db.invite.findFirst({ where: { id, orgId }, select: { id: true } });
   if (!existing) return false;
   await db.invite.delete({ where: { id: existing.id } });
   return true;
}

/**
 * Atomically claim an invite so it can't be redeemed twice. Returns true if this
 * caller won the claim; false if the token was already consumed / is invalid.
 * Call this BEFORE creating the user; on a later failure call `releaseInvite`.
 */
export async function claimInvite(token: string): Promise<boolean> {
   const res = await db.invite.updateMany({
      where: { token, acceptedAt: null, expiresAt: { gt: new Date() } },
      data: { acceptedAt: new Date() },
   });
   return res.count === 1;
}

/** Attach the redeeming user to a claimed invite. */
export async function finalizeInvite(token: string, userId: string): Promise<void> {
   await db.invite.updateMany({ where: { token }, data: { acceptedById: userId } });
}

/** Undo a `claimInvite` when the sign-up it was for did not complete. */
export async function releaseInvite(token: string): Promise<void> {
   await db.invite.updateMany({
      where: { token, acceptedById: null },
      data: { acceptedAt: null },
   });
}
