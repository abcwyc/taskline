import 'server-only';
import { PublicError } from './http';
import { Prisma, StateCategory } from '@prisma/client';

import { db } from '@/lib/db';
import { WorkflowStateCreateBody, WorkflowStateDTO, WorkflowStateUpdateBody } from './types';

/**
 * Server-side data access for WorkflowState — the per-org status registry.
 * The client mirrors this into the runtime status registry (mock-data/status),
 * so key/category stay lowercase-dashed on the wire.
 */

const CATEGORY_KEY_TO_ENUM: Record<string, StateCategory> = {
   triage: 'TRIAGE',
   backlog: 'BACKLOG',
   unstarted: 'UNSTARTED',
   started: 'STARTED',
   completed: 'COMPLETED',
   canceled: 'CANCELED',
};
const CATEGORY_ENUM_TO_KEY: Record<string, string> = {
   TRIAGE: 'triage',
   BACKLOG: 'backlog',
   UNSTARTED: 'unstarted',
   STARTED: 'started',
   COMPLETED: 'completed',
   CANCELED: 'canceled',
};

const DEFAULT_COLOR = '#6e798a';
const DEFAULT_ICON = 'circle';

function slugifyKey(name: string): string {
   const key = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
   return key || 'status';
}

async function countStateUsage(ids: string[]): Promise<Map<string, boolean>> {
   const [issueStates, projectStates] = await Promise.all([
      db.issue.groupBy({ by: ['stateId'], where: { stateId: { in: ids } } }),
      db.project.groupBy({ by: ['stateId'], where: { stateId: { in: ids } } }),
   ]);
   const used = new Set<string>([
      ...issueStates.map((i) => i.stateId),
      ...projectStates.map((p) => p.stateId),
   ]);
   return new Map(ids.map((id) => [id, used.has(id)]));
}

export async function listWorkflowStates(orgId: string): Promise<WorkflowStateDTO[]> {
   const rows = await db.workflowState.findMany({
      where: { orgId },
      orderBy: [{ workflowOrder: 'asc' }, { displayOrder: 'asc' }],
   });
   const usage = await countStateUsage(rows.map((r) => r.id));
   return rows.map((r) => ({
      id: r.key,
      name: r.name,
      color: r.color,
      category: CATEGORY_ENUM_TO_KEY[r.category] ?? 'started',
      iconKey: r.iconKey,
      inUse: usage.get(r.id) ?? false,
   }));
}

export async function createWorkflowState(
   orgId: string,
   body: WorkflowStateCreateBody
): Promise<WorkflowStateDTO> {
   if (!body.name?.trim()) throw new PublicError('name is required');
   const category = CATEGORY_KEY_TO_ENUM[body.category ?? 'started'];
   if (!category) throw new PublicError('invalid category');

   const key = body.key ? slugifyKey(body.key) : slugifyKey(body.name);
   const existing = await db.workflowState.findFirst({ where: { orgId, key } });
   if (existing) throw new PublicError(`status key "${key}" already exists`);

   const last = await db.workflowState.findFirst({
      where: { orgId },
      orderBy: { workflowOrder: 'desc' },
      select: { workflowOrder: true, displayOrder: true },
   });

   const row = await db.workflowState.create({
      data: {
         orgId,
         key,
         name: body.name.trim(),
         color: body.color ?? DEFAULT_COLOR,
         category,
         iconKey: body.iconKey ?? DEFAULT_ICON,
         workflowOrder: (last?.workflowOrder ?? 0) + 1,
         displayOrder: (last?.displayOrder ?? 0) + 1,
      },
   });
   return {
      id: row.key,
      name: row.name,
      color: row.color,
      category: CATEGORY_ENUM_TO_KEY[row.category] ?? 'started',
      iconKey: row.iconKey,
      inUse: false,
   };
}

export async function updateWorkflowState(
   orgId: string,
   key: string,
   body: WorkflowStateUpdateBody
): Promise<WorkflowStateDTO | null> {
   const row = await db.workflowState.findFirst({ where: { orgId, key } });
   if (!row) return null;

   const data: Prisma.WorkflowStateUpdateInput = {};
   if (body.name !== undefined) {
      if (!body.name.trim()) throw new PublicError('name cannot be empty');
      data.name = body.name.trim();
   }
   if (body.color !== undefined) data.color = body.color;
   if (body.iconKey !== undefined) data.iconKey = body.iconKey;
   if (body.category !== undefined) {
      const category = CATEGORY_KEY_TO_ENUM[body.category];
      if (!category) throw new PublicError('invalid category');
      data.category = category;
   }

   const updated = await db.workflowState.update({ where: { id: row.id }, data });
   const usage = await countStateUsage([row.id]);
   return {
      id: updated.key,
      name: updated.name,
      color: updated.color,
      category: CATEGORY_ENUM_TO_KEY[updated.category] ?? 'started',
      iconKey: updated.iconKey,
      inUse: usage.get(row.id) ?? false,
   };
}

export async function deleteWorkflowState(orgId: string, key: string): Promise<boolean | 'in-use'> {
   const row = await db.workflowState.findFirst({ where: { orgId, key } });
   if (!row) return false;
   const usage = await countStateUsage([row.id]);
   if (usage.get(row.id)) return 'in-use';
   await db.workflowState.delete({ where: { id: row.id } });
   return true;
}
