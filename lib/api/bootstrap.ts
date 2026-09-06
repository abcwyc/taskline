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

export async function ensureWorkspace() {
   const existing = await db.organization.findFirst({ orderBy: { createdAt: 'asc' } });
   if (existing) return existing;

   const org = await db.organization.create({
      data: { slug: 'workspace', name: 'Workspace', issuePrefix: 'TASK' },
   });

   const wf = new Map(workflowOrderedStatus.map((s, i) => [s.id, i]));
   const disp = new Map(displayOrderedStatus.map((s, i) => [s.id, i]));
   await db.workflowState.createMany({
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

   await db.label.createMany({
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
   await db.team.create({
      data: { id: 'GEN', orgId: org.id, key: 'GEN', name: 'General', icon: '📋', color: '#95a2b3' },
   });

   return org;
}
