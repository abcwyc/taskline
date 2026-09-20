'use client';

import { Cycle, cycleStatusLabel } from '@/mock-data/cycles';
import { cn } from '@/lib/utils';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CycleDialog } from '@/components/common/forms/cycle-dialog';
import { useLanguage } from '@/components/providers/language-provider';
import { useCyclesStore } from '@/store/cycles-store';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CapacityRing } from './capacity-ring';

export function CyclePlayIcon({ className }: { className?: string }) {
   return (
      <svg
         width="16"
         height="16"
         viewBox="0 0 16 16"
         fill="none"
         className={cn('text-muted-foreground shrink-0', className)}
         role="img"
         focusable="false"
      >
         <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
         <path d="M6.75 5.75L10.25 8L6.75 10.25V5.75Z" fill="currentColor" />
      </svg>
   );
}

interface CycleLineProps {
   cycle: Cycle;
}

/**
 * One row of the cycles timeline. Current / upcoming cycles link to their
 * dedicated issue views ("/cycle/active" and "/cycle/upcoming").
 */
export default function CycleLine({ cycle }: CycleLineProps) {
   const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
   const { t } = useLanguage();
   const deleteCycle = useCyclesStore((s) => s.deleteCycle);
   const [editOpen, setEditOpen] = useState(false);

   const rowMenu = (
      <DropdownMenu>
         <DropdownMenuTrigger
            onClick={(e) => e.preventDefault()}
            className="text-muted-foreground hover:text-foreground shrink-0"
         >
            <MoreHorizontal className="size-4" />
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>{t('Edit')}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => deleteCycle(cycle.id)}>
               {t('Delete')}
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );

   const href =
      cycle.status === 'current'
         ? `/${orgId}/team/${teamId}/cycle/active`
         : cycle.status === 'upcoming'
           ? `/${orgId}/team/${teamId}/cycle/upcoming`
           : undefined;

   const content = (
      <div className="w-full flex items-center justify-between gap-4 px-6 h-12 hover:bg-sidebar/50 rounded-md">
         <div className="flex items-center gap-3 min-w-0">
            <CyclePlayIcon />
            <span className="text-sm font-medium truncate">{cycle.name}</span>
         </div>

         <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <span className="text-xs px-2 py-1 rounded-md bg-accent text-muted-foreground whitespace-nowrap">
               {t(cycleStatusLabel[cycle.status])}
            </span>

            {cycle.status === 'completed' ? (
               <>
                  <div className="hidden sm:flex items-center gap-2 w-28 justify-end">
                     <CapacityRing value={cycle.successRate ?? 0} color="#6771c5" />
                     <span className="text-sm">
                        {cycle.successRate ?? 0}%{' '}
                        <span className="text-muted-foreground">{t('success')}</span>
                     </span>
                  </div>
                  <span className="hidden md:inline-block text-sm w-28 text-right">
                     {cycle.completed}{' '}
                     <span className="text-muted-foreground">{t('completed')}</span>
                  </span>
               </>
            ) : (
               <div className="hidden sm:flex items-center gap-2 w-36 justify-end whitespace-nowrap">
                  <CapacityRing value={cycle.capacity} color="#6771c5" />
                  <span className="text-sm">
                     {cycle.capacity}%{' '}
                     <span className="text-muted-foreground">{t('of capacity')}</span>
                  </span>
               </div>
            )}

            <span className="text-sm w-14 sm:w-20 text-right whitespace-nowrap">
               {cycle.scope} <span className="text-muted-foreground">{t('scope')}</span>
            </span>
            {rowMenu}
         </div>
      </div>
   );

   return (
      <>
         {href ? (
            <Link href={href} className="block w-full">
               {content}
            </Link>
         ) : (
            content
         )}
         <CycleDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            teamId={cycle.teamId}
            cycle={cycle}
         />
      </>
   );
}
