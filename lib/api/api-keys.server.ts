import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

import { db } from '@/lib/db';

/**
 * Personal API keys. The full key `circle_<44 chars>` is shown exactly once
 * at creation; only its SHA-256 hash and an 8-char identification prefix are
 * stored. Authenticated requests carry it as `Authorization: Bearer circle_…`
 * and act with the creator's role (see lib/api/context.ts).
 */

export interface ApiKeyDTO {
   id: string;
   name: string;
   prefix: string;
   createdAt: string;
   lastUsedAt: string | null;
   revokedAt: string | null;
}

const hash = (key: string) => createHash('sha256').update(key, 'utf8').digest('hex');

function serialize(row: {
   id: string;
   name: string;
   prefix: string;
   createdAt: Date;
   lastUsedAt: Date | null;
   revokedAt: Date | null;
}): ApiKeyDTO {
   return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
   };
}

export async function listApiKeys(userId: string): Promise<ApiKeyDTO[]> {
   const rows = await db.apiKey.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
   });
   return rows.map(serialize);
}

export async function createApiKey(
   orgId: string,
   userId: string,
   name: string
): Promise<ApiKeyDTO & { key: string }> {
   const secret = randomBytes(33).toString('base64url'); // ~44 chars, url-safe
   const full = `circle_${secret}`;
   const prefix = full.slice(0, 14);
   const row = await db.apiKey.create({
      data: {
         orgId,
         createdById: userId,
         name: name.trim().slice(0, 80) || 'API key',
         prefix,
         hash: hash(full),
      },
   });
   return { ...serialize(row), key: full };
}

export async function revokeApiKey(userId: string, id: string): Promise<boolean> {
   const res = await db.apiKey.updateMany({
      where: { id, createdById: userId, revokedAt: null },
      data: { revokedAt: new Date() },
   });
   return res.count > 0;
}

/** Resolve a bearer key to its org/user/role context; null when invalid. */
export async function resolveApiKey(
   bearer: string
): Promise<{ orgId: string; userId: string; role: 'ADMIN' | 'MEMBER' | 'GUEST' } | null> {
   if (!bearer.startsWith('circle_')) return null;
   const row = await db.apiKey.findUnique({
      where: { hash: hash(bearer) },
      select: {
         orgId: true,
         revokedAt: true,
         createdBy: {
            select: {
               id: true,
               memberships: { select: { role: true, orgId: true } },
            },
         },
      },
   });
   if (!row || row.revokedAt) return null;
   const membership = row.createdBy.memberships.find((m) => m.orgId === row.orgId);
   if (!membership) return null;
   const role =
      membership.role === 'ADMIN' || membership.role === 'MEMBER' || membership.role === 'GUEST'
         ? membership.role
         : 'GUEST';
   // Fire-and-forget usage stamp; never blocks the request.
   void db.apiKey
      .update({ where: { hash: hash(bearer) }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
   return { orgId: row.orgId, userId: row.createdBy.id, role };
}
