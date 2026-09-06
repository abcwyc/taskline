import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';

import { PublicError } from './http';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Guard that every foreign-key id a client sent actually belongs to this
 * workspace before we `connect` it. Without this a caller could attach an issue
 * to another org's project / cycle / label / user (a cross-tenant reference once
 * the app is multi-workspace; today it just prevents malformed writes).
 *
 * `undefined` fields are skipped; `null` is allowed (means "clear the relation").
 */
export async function assertOrgScope(
   client: Db,
   orgId: string,
   refs: {
      projectId?: string | null;
      cycleId?: string | null;
      assigneeId?: string | null;
      leadId?: string | null;
      ownerId?: string | null;
      initiativeId?: string | null;
      statusId?: string; // WorkflowState
      teamId?: string;
      labelIds?: string[];
      leadTeamId?: string | null;
   }
): Promise<void> {
   const checks: Promise<void>[] = [];
   const one = (present: boolean, id: string | null | undefined, find: () => Promise<unknown>) => {
      if (!present || id == null || id === '') return;
      checks.push(
         find().then((row) => {
            if (!row) throw new PublicError(`unknown reference: ${id}`, 400);
         })
      );
   };

   one('projectId' in refs, refs.projectId, () =>
      client.project.findFirst({ where: { id: refs.projectId!, orgId }, select: { id: true } })
   );
   one('cycleId' in refs, refs.cycleId, () =>
      client.cycle.findFirst({
         where: { id: refs.cycleId!, team: { orgId } },
         select: { id: true },
      })
   );
   one('statusId' in refs, refs.statusId, () =>
      client.workflowState.findFirst({
         where: { id: refs.statusId!, orgId },
         select: { id: true },
      })
   );
   one('teamId' in refs, refs.teamId, () =>
      client.team.findFirst({ where: { id: refs.teamId!, orgId }, select: { id: true } })
   );
   one('initiativeId' in refs, refs.initiativeId, () =>
      client.initiative.findFirst({
         where: { id: refs.initiativeId!, orgId },
         select: { id: true },
      })
   );
   for (const key of ['assigneeId', 'leadId', 'ownerId'] as const) {
      one(key in refs, refs[key], () =>
         client.membership.findFirst({
            where: { userId: refs[key]!, orgId },
            select: { id: true },
         })
      );
   }
   one('leadTeamId' in refs, refs.leadTeamId, () =>
      client.team.findFirst({ where: { id: refs.leadTeamId!, orgId }, select: { id: true } })
   );

   if (refs.labelIds && refs.labelIds.length) {
      checks.push(
         client.label.count({ where: { id: { in: refs.labelIds }, orgId } }).then((n) => {
            if (n !== new Set(refs.labelIds).size) {
               throw new PublicError('one or more labels do not belong to this workspace', 400);
            }
         })
      );
   }

   await Promise.all(checks);
}
