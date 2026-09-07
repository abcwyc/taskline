import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { labels as mockLabels } from '@/mock-data/labels';
import {
   displayOrderedStatus,
   status as mockStatus,
   workflowOrderedStatus,
} from '@/mock-data/status';

/**
 * Guarantees a workspace exists (the template is single-workspace). Used by
 * sign-up: the demo workspace normally comes from `pnpm db:seed`, but if someone
 * boots a fresh DB and just registers, this creates a minimal but functional
 * org (workflow states + labels + one team) so issues can be created.
 */

const CATEGORY: Record<
   string,
   'TRIAGE' | 'BACKLOG' | 'UNSTARTED' | 'STARTED' | 'COMPLETED' | 'CANCELED'
> = {
   triage: 'TRIAGE',
   backlog: 'BACKLOG',
   unstarted: 'UNSTARTED',
   started: 'STARTED',
   completed: 'COMPLETED',
   canceled: 'CANCELED',
};

type WorkspaceClient = Pick<
   Prisma.TransactionClient,
   'organization' | 'workflowState' | 'label' | 'team'
>;

export class WorkspaceAlreadyInitializedError extends Error {
   constructor() {
      super('workspace already has members');
   }
}

export class DirectSignupError extends Error {
   constructor(public readonly code: 'bootstrap' | 'inviteonly' | 'exists') {
      super(code);
   }
}

export interface NewAccountInput {
   email: string;
   name: string;
   passwordHash: string;
}

export async function ensureWorkspace(client: WorkspaceClient = db) {
   const existing = await client.organization.findFirst({ orderBy: { createdAt: 'asc' } });
   if (existing) return existing;

   const org = await client.organization.create({
      data: { slug: 'workspace', name: 'Workspace', issuePrefix: 'TASK' },
   });

   const wf = new Map(workflowOrderedStatus.map((s, i) => [s.id, i]));
   const disp = new Map(displayOrderedStatus.map((s, i) => [s.id, i]));
   await client.workflowState.createMany({
      data: mockStatus.map((s) => ({
         id: s.id,
         orgId: org.id,
         key: s.id,
         name: s.name,
         color: s.color,
         category: CATEGORY[s.category],
         iconKey: s.id,
         workflowOrder: wf.get(s.id) ?? 0,
         displayOrder: disp.get(s.id) ?? 0,
      })),
   });

   await client.label.createMany({
      data: mockLabels.map((l) => ({
         id: l.id,
         orgId: org.id,
         key: l.id,
         name: l.name,
         color: l.color,
      })),
   });

   // PK == key, matching the seed convention: the whole projects/team code path
   // resolves teams by the `[teamId]` URL segment, which is the key.
   await client.team.create({
      data: { id: 'GEN', orgId: org.id, key: 'GEN', name: 'General', icon: '📋', color: '#95a2b3' },
   });

   return org;
}

/**
 * Serializes every path that can create the first account. The transaction
 * lock covers the empty-database check, workspace bootstrap and ADMIN insert.
 */
export async function createFirstAdmin(input: NewAccountInput) {
   return db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'circle:first-admin'}, 0))`;

      if ((await tx.user.count()) > 0) throw new WorkspaceAlreadyInitializedError();

      const org = await ensureWorkspace(tx);
      const user = await tx.user.create({
         data: {
            email: input.email,
            name: input.name,
            passwordHash: input.passwordHash,
            memberships: { create: { orgId: org.id, role: 'ADMIN' } },
         },
         select: { id: true, email: true },
      });
      return { user, org };
   });
}

/**
 * Creates a non-invite account while holding the same lock as bootstrap. This
 * prevents two concurrent requests both deciding they are the first ADMIN.
 */
export async function createDirectAccount(
   input: NewAccountInput,
   options: { openSignup: boolean; bootstrapAuthorized: boolean }
) {
   return db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'circle:first-admin'}, 0))`;

      const firstAccount = (await tx.user.count()) === 0;
      if (firstAccount && !options.bootstrapAuthorized) throw new DirectSignupError('bootstrap');
      if (!firstAccount && !options.openSignup) throw new DirectSignupError('inviteonly');
      if (await tx.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
         throw new DirectSignupError('exists');
      }

      const org = await ensureWorkspace(tx);
      const user = await tx.user.create({
         data: {
            email: input.email,
            name: input.name,
            passwordHash: input.passwordHash,
            memberships: { create: { orgId: org.id, role: firstAccount ? 'ADMIN' : 'MEMBER' } },
         },
         select: { id: true },
      });
      return { user, org };
   });
}
