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

   const tag = `t${Date.now()}${Math.floor(Math.random() * 1000)}`;
   let orgId = '';
   let otherOrgId = '';
   let adminId = '';
   let foreignProjectId = '';

   beforeAll(async () => {
      process.env.DATABASE_URL = url;
      ({ db } = await import('@/lib/db'));
      ({ assertOrgScope } = await import('@/lib/api/ownership.server'));
      ({ claimInvite } = await import('@/lib/api/invites.server'));
      ({ updateMember } = await import('@/lib/api/members.server'));

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

      // a project that belongs to the OTHER org, plus the rows it needs
      const state = await db.workflowState.create({
         data: {
            id: `${tag}-todo`,
            orgId: otherOrgId,
            key: 'to-do',
            name: 'Todo',
            color: '#888',
            category: 'UNSTARTED',
            iconKey: 'to-do',
            workflowOrder: 0,
            displayOrder: 0,
         },
      });
      const team = await db.team.create({
         data: {
            id: `${tag}-B`,
            orgId: otherOrgId,
            key: `${tag}B`,
            name: 'B',
            icon: '📋',
            color: '#000',
         },
      });
      const project = await db.project.create({
         data: {
            orgId: otherOrgId,
            name: 'B project',
            icon: 'Box',
            teamId: team.id,
            stateId: state.id,
         },
      });
      foreignProjectId = project.id;
      expect(foreignProjectId).toBeTruthy(); // fixture must exist or the test below is meaningless
   });

   afterAll(async () => {
      await db.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
      await db.$disconnect();
   });

   it('assertOrgScope rejects a foreign project id', async () => {
      await expect(assertOrgScope(db, orgId, { projectId: foreignProjectId })).rejects.toThrow();
   });

   it('assertOrgScope accepts an in-org project id', async () => {
      const mine = await db.project.create({
         data: {
            orgId,
            name: 'mine',
            icon: 'Box',
            teamId: (
               await db.team.create({
                  data: {
                     id: `${tag}-A`,
                     orgId,
                     key: `${tag}A`,
                     name: 'A',
                     icon: '📋',
                     color: '#000',
                  },
               })
            ).id,
            stateId: (
               await db.workflowState.create({
                  data: {
                     id: `${tag}-a-todo`,
                     orgId,
                     key: 'to-do',
                     name: 'Todo',
                     color: '#888',
                     category: 'UNSTARTED',
                     iconKey: 'to-do',
                     workflowOrder: 0,
                     displayOrder: 0,
                  },
               })
            ).id,
         },
      });
      await expect(assertOrgScope(db, orgId, { projectId: mine.id })).resolves.toBeUndefined();
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
      const m = await db.membership.findFirst({ where: { orgId, userId: adminId } });
      expect(m?.role).toBe('ADMIN');
   });

   it('two concurrent last-two-admin demotions still leave one admin', async () => {
      const a2 = await db.user.create({
         data: {
            email: `${tag}-a2@x.com`,
            name: 'A2',
            memberships: { create: { orgId, role: 'ADMIN' } },
         },
      });
      // both try to self-demote at once
      const outcomes = await Promise.allSettled([
         updateMember(orgId, adminId, { role: 'Member' }),
         updateMember(orgId, a2.id, { role: 'Member' }),
      ]);
      const ok = outcomes.filter((o) => o.status === 'fulfilled').length;
      expect(ok).toBe(1); // exactly one demotion succeeds
      const admins = await db.membership.count({ where: { orgId, role: 'ADMIN' } });
      expect(admins).toBe(1);
   });
});
