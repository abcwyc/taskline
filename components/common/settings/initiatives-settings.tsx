'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InitiativeStatusIcon } from '@/components/common/initiatives/initiative-status-icon';
import { cn } from '@/lib/utils';
import { INITIATIVE_STATUS_META, type Initiative } from '@/mock-data/initiatives';
import { useMembersStore } from '@/store/members-store';
import { getInitiativeProjects, useInitiativesStore } from '@/store/initiatives-store';
import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

/** Workspace "Initiatives" settings: a read-only overview of every initiative.
 *  Creation and editing live on the Initiatives page. */
export default function InitiativesSettings() {
   const { orgId } = useParams<{ orgId: string }>();
   const initiatives = useInitiativesStore((s) => s.initiatives);
   const hydrate = useInitiativesStore((s) => s.hydrate);
   const members = useMembersStore((s) => s.members);

   useEffect(() => {
      void hydrate().catch(() => undefined);
   }, [hydrate]);

   const ownerOf = (initiative: Initiative) =>
      initiative.owner
         ? (members.find((member) => member.id === initiative.owner?.id) ?? initiative.owner)
         : undefined;

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-5xl mx-auto px-6 py-10 pb-20">
            <h1 className="text-2xl font-medium">Initiatives</h1>
            <p className="text-sm text-muted-foreground mt-1">
               Group projects into larger bodies of work
            </p>
            <p className="text-xs text-muted-foreground mt-2">
               Create and edit initiatives from the{' '}
               <Link
                  href={`/${orgId}/initiatives`}
                  className="underline underline-offset-2 hover:text-foreground"
               >
                  Initiatives page
               </Link>
               .
            </p>

            <div className="mt-6 rounded-lg border bg-container">
               <div className="flex items-center px-4 py-2 text-xs text-muted-foreground border-b">
                  <span className="flex-1 min-w-0">Name</span>
                  <span className="w-28 shrink-0">Status</span>
                  <span className="w-28 shrink-0">Health</span>
                  <span className="hidden sm:flex w-32 shrink-0 items-center gap-1.5">Owner</span>
                  <span className="w-16 shrink-0 text-right">Projects</span>
               </div>
               {initiatives.map((initiative) => {
                  const owner = ownerOf(initiative);
                  const projectCount = getInitiativeProjects(initiative).length;
                  return (
                     <Link
                        key={initiative.id}
                        href={`/${orgId}/initiative/${initiative.id}`}
                        className="flex items-center px-4 py-2.5 text-sm border-b border-border/40 last:border-b-0 hover:bg-sidebar/50 transition-colors"
                     >
                        <span className="flex-1 min-w-0 flex items-center gap-2.5 pr-4">
                           <span className="inline-flex size-6 items-center justify-center rounded bg-muted/50 text-sm shrink-0">
                              {initiative.icon}
                           </span>
                           <span className="truncate" title={initiative.name}>
                              {initiative.name}
                           </span>
                        </span>
                        <span className="w-28 shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                           <InitiativeStatusIcon status={initiative.status} />
                           {INITIATIVE_STATUS_META[initiative.status].label}
                        </span>
                        <span className="w-28 shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                           <span
                              className={cn(
                                 'size-3.5 rounded-full border-2 shrink-0',
                                 initiative.health.id === 'no-update' &&
                                    'border-muted-foreground/40'
                              )}
                              style={
                                 initiative.health.id !== 'no-update'
                                    ? { borderColor: initiative.health.color }
                                    : undefined
                              }
                           />
                           {initiative.health.id === 'no-update'
                              ? 'No updates'
                              : initiative.health.name}
                        </span>
                        <span className="hidden sm:flex w-32 shrink-0 items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                           {owner ? (
                              <>
                                 <Avatar className="size-4">
                                    <AvatarImage src={owner.avatarUrl} alt={owner.name} />
                                    <AvatarFallback className="text-[8px]">
                                       {owner.name[0]}
                                    </AvatarFallback>
                                 </Avatar>
                                 <span className="truncate">{owner.name}</span>
                              </>
                           ) : (
                              <>
                                 <UserRound className="size-3.5 shrink-0" />
                                 <span>No owner</span>
                              </>
                           )}
                        </span>
                        <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                           {projectCount}
                        </span>
                     </Link>
                  );
               })}
               {initiatives.length === 0 && (
                  <p className="text-sm text-muted-foreground px-4 py-6">No initiatives yet.</p>
               )}
            </div>
         </div>
      </div>
   );
}
