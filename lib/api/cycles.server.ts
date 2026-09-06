import 'server-only';
import { PublicError } from './http';
import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import {
   CYCLE_STATUS_ENUM_TO_KEY,
   CYCLE_STATUS_KEY_TO_ENUM,
   CycleCreateBody,
   CycleDTO,
   CycleUpdateBody,
} from './types';

/** Server-side data access for cycles. scope/started/completed are derived. */

type CycleRow = Prisma.CycleGetPayload<{ include: { burnup: true } }>;

/** completed / started / total issue counts per cycle in three grouped queries */
async function statsByCycle(orgId: string, cycleIds: string[]) {
   const out = new Map<string, { scope: number; started: number; completed: number }>();
   if (!cycleIds.length) return out;
   const [totals, started, completed] = await Promise.all([
      db.issue.groupBy({
         by: ['cycleId'],
         where: { orgId, cycleId: { in: cycleIds } },
         _count: { _all: true },
      }),
      db.issue.groupBy({
         by: ['cycleId'],
         where: { orgId, cycleId: { in: cycleIds }, state: { category: 'STARTED' } },
         _count: { _all: true },
      }),
      db.issue.groupBy({
         by: ['cycleId'],
         where: { orgId, cycleId: { in: cycleIds }, state: { category: 'COMPLETED' } },
         _count: { _all: true },
      }),
   ]);
   const s = new Map(started.map((r) => [r.cycleId, r._count._all]));
   const c = new Map(completed.map((r) => [r.cycleId, r._count._all]));
   for (const t of totals) {
      if (!t.cycleId) continue;
      out.set(t.cycleId, {
         scope: t._count._all,
         started: s.get(t.cycleId) ?? 0,
         completed: c.get(t.cycleId) ?? 0,
      });
   }
   return out;
}

function serialize(
   row: CycleRow,
   teamKey: string,
   stats: { scope: number; started: number; completed: number } | undefined
): CycleDTO {
   const scope = stats?.scope ?? 0;
   const completed = stats?.completed ?? 0;
   const statusKey = CYCLE_STATUS_ENUM_TO_KEY[row.status] ?? 'planned';
   return {
      id: row.id,
      number: row.number,
      name: row.name,
      teamId: teamKey,
      status: statusKey,
      startDate: row.startDate.toISOString().slice(0, 10),
      endDate: row.endDate.toISOString().slice(0, 10),
      capacity: row.capacity,
      scope,
      scopeDelta: Math.max(0, scope - row.capacity),
      started: stats?.started ?? 0,
      completed,
      ...(statusKey === 'completed' && scope > 0
         ? { successRate: Math.round((completed / scope) * 100) }
         : {}),
      burnup: row.burnup.length
         ? row.burnup
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((p) => ({
                 date: p.date.toISOString().slice(0, 10),
                 scope: p.scope,
                 started: p.started,
                 completed: p.completed,
                 ideal: p.ideal,
              }))
         : undefined,
   };
}

export async function listCycles(orgId: string): Promise<CycleDTO[]> {
   const rows = await db.cycle.findMany({
      where: { team: { orgId } },
      include: { burnup: true, team: { select: { key: true } } },
      orderBy: { number: 'desc' },
   });
   const stats = await statsByCycle(
      orgId,
      rows.map((r) => r.id)
   );
   return rows.map((r) => serialize(r, r.team.key, stats.get(r.id)));
}

export async function getCycle(orgId: string, id: string): Promise<CycleDTO | null> {
   const row = await db.cycle.findFirst({
      where: { id, team: { orgId } },
      include: { burnup: true, team: { select: { key: true } } },
   });
   if (!row) return null;
   const stats = await statsByCycle(orgId, [row.id]);
   return serialize(row, row.team.key, stats.get(row.id));
}

/* -------------------------------- writes -------------------------------- */

async function resolveTeam(orgId: string, teamKey: string | undefined) {
   const team = teamKey
      ? await db.team.findFirst({ where: { orgId, key: teamKey } })
      : await db.team.findFirst({ where: { orgId }, orderBy: { key: 'asc' } });
   if (!team) throw new PublicError('team not found');
   return team;
}

export async function createCycle(orgId: string, body: CycleCreateBody): Promise<CycleDTO> {
   const team = await resolveTeam(orgId, body.teamId);
   const last = await db.cycle.findFirst({
      where: { teamId: team.id },
      orderBy: { number: 'desc' },
      select: { number: true },
   });
   const number = (last?.number ?? 0) + 1;

   const row = await db.cycle.create({
      data: {
         team: { connect: { id: team.id } },
         number,
         name: body.name?.trim() || `Cycle ${number}`,
         status: (CYCLE_STATUS_KEY_TO_ENUM[body.status ?? 'planned'] ?? 'PLANNED') as never,
         startDate: body.startDate ? new Date(body.startDate) : new Date(),
         endDate: body.endDate ? new Date(body.endDate) : new Date(Date.now() + 12096e5),
         capacity: body.capacity ?? 0,
      },
      include: { burnup: true, team: { select: { key: true } } },
   });
   return serialize(row, row.team.key, undefined);
}

export async function updateCycle(
   orgId: string,
   id: string,
   body: CycleUpdateBody
): Promise<CycleDTO | null> {
   const existing = await db.cycle.findFirst({
      where: { id, team: { orgId } },
      select: { id: true },
   });
   if (!existing) return null;

   const data: Prisma.CycleUpdateInput = {};
   if (body.name !== undefined) data.name = body.name;
   if (body.status !== undefined) {
      data.status = (CYCLE_STATUS_KEY_TO_ENUM[body.status] ?? 'PLANNED') as never;
   }
   if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
   if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
   if (body.capacity !== undefined) data.capacity = body.capacity;
   if (body.teamId !== undefined) {
      const team = await resolveTeam(orgId, body.teamId);
      data.team = { connect: { id: team.id } };
   }

   await db.cycle.update({ where: { id: existing.id }, data });
   return getCycle(orgId, existing.id);
}

export async function deleteCycle(orgId: string, id: string): Promise<boolean> {
   const existing = await db.cycle.findFirst({
      where: { id, team: { orgId } },
      select: { id: true },
   });
   if (!existing) return false;
   await db.$transaction([
      db.issue.updateMany({ where: { cycleId: existing.id }, data: { cycleId: null } }),
      db.cycle.delete({ where: { id: existing.id } }),
   ]);
   return true;
}
