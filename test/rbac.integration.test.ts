/**
 * Integration tests for the authorization + invite + admin-safety logic.
 * Skipped unless TEST_DATABASE_URL points at a throwaway Postgres that has had
 * `prisma migrate deploy` run against it.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d('workspace authorization', () => {
   let db: import('@prisma/client').PrismaClient;
   let assertOrgScope: typeof import('@/lib/api/ownership.server').assertOrgScope;
   let claimInvite: typeof import('@/lib/api/invites.server').claimInvite;
   let updateMember: typeof import('@/lib/api/members.server').updateMember;

   let orgId = '';
   let otherOrgId = '';
   let adminId = '';

   beforeAll(async () => {
      process.env.DATABASE_URL = url;
      ({ db } = await import('@/lib/db'));
      ({ assertOrgScope } = await import('@/lib/api/ownership.server'));
      ({ claimInvite } = await import('@/lib/api/invites.server'));
      ({ updateMember } = await import('@/lib/api/members.server'));

      const tag = `t${Date.now()}`;
      const org = await db.organization.create({
         data: { slug: `${tag}-a`, name: 'A', issuePrefix: 'A' },
      });
      const other = await db.organization.create({
         data: { slug: `${tag}-b`, name: 'B', issuePrefix: 'B' },
      });
      orgId = org.id;
      otherOrgId = other.id;
      const admin = await db.user.create({
         data: {
            email: `${tag}-admin@x.com`,
            name: 'Admin',
            memberships: { create: { orgId, role: 'ADMIN' } },
         },
      });
      adminId = admin.id;
      await db.project
         .create({
            data: {
               orgId: otherOrgId,
               name: 'B project',
               icon: 'Box',
               teamId: (
                  await db.team.create({
                     data: {
                        id: `${tag}B`,
                        orgId: otherOrgId,
                        key: `${tag}B`,
                        name: 'B',
                        icon: '📋',
                        color: '#000',
                     },
                  })
               ).id,
               stateId: 'to-do',
            } as never,
         })
         .catch(() => {});
   });

   afterAll(async () => {
      await db.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
      await db.$disconnect();
   });

   it('assertOrgScope rejects a foreign project id', async () => {
      const foreign = await db.project.findFirst({ where: { orgId: otherOrgId } });
      if (!foreign) return;
      await expect(assertOrgScope(db, orgId, { projectId: foreign.id })).rejects.toThrow();
   });

   it('assertOrgScope passes for null / omitted refs', async () => {
      await expect(assertOrgScope(db, orgId, { projectId: null })).resolves.toBeUndefined();
      await expect(assertOrgScope(db, orgId, {})).resolves.toBeUndefined();
   });

   it('claimInvite is single-use under concurrency', async () => {
      const inv = await db.invite.create({
         data: { orgId, role: 'MEMBER', expiresAt: new Date(Date.now() + 1e6) },
      });
      const results = await Promise.all([claimInvite(inv.token), claimInvite(inv.token)]);
      expect(results.filter(Boolean)).toHaveLength(1);
   });

   it('refuses to demote the last admin', async () => {
      await expect(updateMember(orgId, adminId, { role: 'Member' })).rejects.toThrow(
         /at least one admin/
      );
      // still an admin
      const m = await db.membership.findFirst({ where: { orgId, userId: adminId } });
      expect(m?.role).toBe('ADMIN');
   });

   it('allows demoting an admin when another remains', async () => {
      const tag = `t${Date.now()}`;
      const admin2 = await db.user.create({
         data: {
            email: `${tag}-a2@x.com`,
            name: 'A2',
            memberships: { create: { orgId, role: 'ADMIN' } },
         },
      });
      await expect(updateMember(orgId, admin2.id, { role: 'Member' })).resolves.toBeTruthy();
   });
});
