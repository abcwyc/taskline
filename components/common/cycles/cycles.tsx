'use client';

import { Button } from '@/components/ui/button';
import { CycleDialog } from '@/components/common/forms/cycle-dialog';
import { useCyclesStore } from '@/store/cycles-store';
import { useTeamsStore } from '@/store/teams-store';
import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Fragment, useState } from 'react';
import CycleLine from './cycle-line';
import { CycleBurnupChart, CycleProgressLegend } from './cycle-burnup-chart';

/**
 * Cycles timeline: a date rail on the left and one row per cycle,
 * newest first. The current cycle is expanded with its burn-up chart.
 */
export default function Cycles() {
   const { teamId } = useParams<{ teamId: string }>();
   const teams = useTeamsStore((s) => s.teams);
   const allCycles = useCyclesStore((s) => s.cycles);
   const team = teams.find((t) => t.id === teamId) ?? teams[0];
   const scopeKey = team?.id ?? teamId;
   const cycles = scopeKey ? allCycles.filter((c) => c.teamId === scopeKey) : allCycles;

   const [dialogOpen, setDialogOpen] = useState(false);

   return (
      <div className="w-full py-4">
         <div className="flex items-center justify-end px-6 pb-2">
            <Button size="xs" onClick={() => setDialogOpen(true)}>
               <Plus className="size-3.5" />
               New cycle
            </Button>
         </div>

         {cycles.map((cycle) => (
            <Fragment key={cycle.id}>
               <div className="w-full flex items-stretch">
                  {/* Date rail */}
                  <div className="relative w-14 sm:w-20 shrink-0 flex flex-col items-end pr-4">
                     <div className="absolute right-[20.5px] top-0 bottom-0 w-px bg-border" />
                     <div className="flex items-center gap-2 h-12">
                        <span className="text-[11px] leading-tight text-muted-foreground text-right">
                           {format(parseISO(cycle.startDate), 'MMM')}
                           <br />
                           {format(parseISO(cycle.startDate), 'd')}
                        </span>
                        <span
                           className={
                              'relative z-10 size-2.5 rounded-full border-2 bg-background ' +
                              (cycle.status === 'current'
                                 ? 'border-indigo-400 bg-indigo-400'
                                 : 'border-muted-foreground/40')
                           }
                        />
                     </div>
                  </div>

                  <div className="flex-1 min-w-0 border-b border-border/60">
                     <CycleLine cycle={cycle} />

                     {cycle.status === 'current' && (
                        <div className="flex flex-col lg:flex-row items-stretch gap-8 px-6 pb-6 pt-2">
                           <div className="flex-1 min-w-0">
                              <CycleBurnupChart cycle={cycle} height={220} />
                           </div>
                           <div className="lg:w-64 shrink-0 flex items-center">
                              <CycleProgressLegend cycle={cycle} />
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </Fragment>
         ))}

         {cycles.length === 0 && (
            <p className="px-6 py-10 text-sm text-muted-foreground">No cycles yet.</p>
         )}

         {scopeKey && (
            <CycleDialog open={dialogOpen} onOpenChange={setDialogOpen} teamId={scopeKey} />
         )}
      </div>
   );
}
