import 'server-only';

import { db } from '@/lib/db';

export function idealCompletion(scope: number, startDate: Date, endDate: Date, date: Date): number {
   const duration = Math.max(1, endDate.getTime() - startDate.getTime());
   const elapsed = Math.min(duration, Math.max(0, date.getTime() - startDate.getTime()));
   return Number((scope * (elapsed / duration)).toFixed(2));
}

/** Upsert today's burn-up point for every cycle whose date range includes today. */
export async function snapshotCycleBurnup(now = new Date()): Promise<number> {
   const today = new Date(now);
   today.setUTCHours(0, 0, 0, 0);

   const cycles = await db.cycle.findMany({
      where: { startDate: { lte: today }, endDate: { gte: today } },
      select: { id: true, startDate: true, endDate: true },
   });
   if (!cycles.length) return 0;

   const cycleIds = cycles.map((cycle) => cycle.id);
   const [totals, started, completed] = await Promise.all([
      db.issue.groupBy({
         by: ['cycleId'],
         where: { cycleId: { in: cycleIds } },
         _count: { _all: true },
      }),
      db.issue.groupBy({
         by: ['cycleId'],
         where: {
            cycleId: { in: cycleIds },
            state: { category: { in: ['STARTED', 'COMPLETED'] } },
         },
         _count: { _all: true },
      }),
      db.issue.groupBy({
         by: ['cycleId'],
         where: { cycleId: { in: cycleIds }, state: { category: 'COMPLETED' } },
         _count: { _all: true },
      }),
   ]);

   const totalByCycle = new Map(totals.map((row) => [row.cycleId, row._count._all]));
   const startedByCycle = new Map(started.map((row) => [row.cycleId, row._count._all]));
   const completedByCycle = new Map(completed.map((row) => [row.cycleId, row._count._all]));

   await db.$transaction(
      cycles.map((cycle) => {
         const scope = totalByCycle.get(cycle.id) ?? 0;
         const data = {
            scope,
            started: startedByCycle.get(cycle.id) ?? 0,
            completed: completedByCycle.get(cycle.id) ?? 0,
            ideal: idealCompletion(scope, cycle.startDate, cycle.endDate, today),
         };
         return db.cycleBurnupPoint.upsert({
            where: { cycleId_date: { cycleId: cycle.id, date: today } },
            create: { cycleId: cycle.id, date: today, ...data },
            update: data,
         });
      })
   );
   return cycles.length;
}
