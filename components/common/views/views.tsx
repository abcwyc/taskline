'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { formatAppDate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { View } from '@/mock-data/views';
import { ViewDialog } from '@/components/common/forms/view-dialog';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useViewsStore } from '@/store/views-store';
import { useTeamsStore } from '@/store/teams-store';
import { useViewsDisplayStore, ViewsOrdering } from '@/store/views-display-store';
import { ArrowDown, MoreHorizontal, Plus, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';

const TABS = ['issues', 'projects'] as const;

function DisplayOptions() {
   const { t } = useLanguage();
   const { ordering, displayProperties, setOrdering, toggleProperty } = useViewsDisplayStore();

   return (
      <Popover>
         <PopoverTrigger asChild>
            <Button size="xs" variant="ghost">
               <SlidersHorizontal className="size-4" />
            </Button>
         </PopoverTrigger>
         <PopoverContent align="end" className="w-72 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
               <span className="text-xs text-muted-foreground">{t('Ordering')}</span>
               <Select
                  value={ordering}
                  onValueChange={(value) => setOrdering(value as ViewsOrdering)}
               >
                  <SelectTrigger className="w-32 h-7 text-xs">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="name">{t('Name')}</SelectItem>
                     <SelectItem value="created">{t('Created')}</SelectItem>
                     <SelectItem value="updated">{t('Updated')}</SelectItem>
                  </SelectContent>
               </Select>
            </div>
            <div className="flex flex-col gap-2">
               <span className="text-xs text-muted-foreground">{t('Display properties')}</span>
               <div className="flex flex-wrap gap-1.5">
                  {(
                     [
                        ['created', 'Created'],
                        ['updated', 'Updated'],
                        ['owner', 'Owner'],
                     ] as const
                  ).map(([key, label]) => (
                     <button
                        key={key}
                        onClick={() => toggleProperty(key)}
                        className={cn(
                           'px-2 py-0.5 rounded-md border text-xs transition-colors',
                           displayProperties[key]
                              ? 'bg-accent border-transparent'
                              : 'text-muted-foreground hover:bg-accent/50'
                        )}
                     >
                        {t(label)}
                     </button>
                  ))}
               </div>
            </div>
         </PopoverContent>
      </Popover>
   );
}

function ViewRow({ view, orgId }: { view: View; orgId: string }) {
   const { locale, t } = useLanguage();
   const { displayProperties } = useViewsDisplayStore();
   const deleteView = useViewsStore((s) => s.deleteView);
   const [editOpen, setEditOpen] = useState(false);
   return (
      <Link
         href={`/${orgId}/view/${view.id}`}
         className="flex items-center gap-3 px-6 py-2.5 border-b border-border/50 hover:bg-sidebar/50 transition-colors"
      >
         <span className="inline-flex size-6 items-center justify-center rounded bg-muted/50 text-sm shrink-0">
            {view.icon}
         </span>
         <span className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">{view.name}</span>
            <span className="text-xs text-muted-foreground truncate">{view.description}</span>
         </span>
         {displayProperties.created && (
            <span className="hidden sm:block text-xs text-muted-foreground w-24 shrink-0">
               {formatAppDate(locale, view.createdAt, 'MMM d, yyyy')}
            </span>
         )}
         {displayProperties.updated && (
            <span className="hidden sm:block text-xs text-muted-foreground w-24 shrink-0">
               {formatAppDate(locale, view.updatedAt, 'MMM d, yyyy')}
            </span>
         )}
         {displayProperties.owner && (
            <span className="flex items-center gap-1.5 w-32 shrink-0 justify-end">
               <Avatar className="size-5">
                  <AvatarImage src={view.owner.avatarUrl} alt={view.owner.name} />
                  <AvatarFallback className="text-[9px]">{view.owner.name[0]}</AvatarFallback>
               </Avatar>
               <span className="text-xs text-muted-foreground truncate max-w-24">
                  {view.owner.name}
               </span>
            </span>
         )}
         <DropdownMenu>
            <DropdownMenuTrigger
               onClick={(e) => e.preventDefault()}
               className="text-muted-foreground hover:text-foreground shrink-0"
            >
               <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
               <DropdownMenuItem
                  onClick={(e) => {
                     e.preventDefault();
                     setEditOpen(true);
                  }}
               >
                  {t('Edit')}
               </DropdownMenuItem>
               <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                     e.preventDefault();
                     deleteView(view.id);
                  }}
               >
                  {t('Delete')}
               </DropdownMenuItem>
            </DropdownMenuContent>
         </DropdownMenu>
         <ViewDialog open={editOpen} onOpenChange={setEditOpen} view={view} />
      </Link>
   );
}

/**
 * "Views" page: saved issue / project views. With a `teamId`, only that
 * team's views are listed (team sidebar "Views" entry); otherwise the whole
 * workspace is shown.
 */
export default function Views({ teamId }: { teamId?: string }) {
   const { t } = useLanguage();
   const teams = useTeamsStore((s) => s.teams);
   const allViews = useViewsStore((s) => s.views);
   const issueViews = useMemo(() => allViews.filter((v) => v.type === 'issue'), [allViews]);
   const projectViews = useMemo(() => allViews.filter((v) => v.type === 'project'), [allViews]);
   const { orgId } = useParams<{ orgId: string }>();
   const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('issues'));
   const { ordering } = useViewsDisplayStore();
   const team = teamId ? teams.find((entry) => entry.id === teamId) : undefined;
   const [newOpen, setNewOpen] = useState(false);

   const list = useMemo(() => {
      let source = tab === 'issues' ? issueViews : projectViews;
      if (teamId) source = source.filter((view) => view.teamId === teamId);
      return [...source].sort((a, b) => {
         if (ordering === 'created') return b.createdAt.localeCompare(a.createdAt);
         if (ordering === 'updated') return b.updatedAt.localeCompare(a.updatedAt);
         return a.name.localeCompare(b.name);
      });
   }, [issueViews, projectViews, tab, ordering, teamId]);

   return (
      <div className="w-full h-full overflow-y-auto">
         <div className="flex items-center justify-between px-6 pt-3 pb-2">
            <div className="flex items-center gap-1.5">
               {TABS.map((candidate) => (
                  <button
                     key={candidate}
                     onClick={() => setTab(candidate)}
                     className={cn(
                        'px-2.5 py-1 rounded-md border text-xs font-medium capitalize transition-colors',
                        tab === candidate
                           ? 'bg-accent border-transparent'
                           : 'text-muted-foreground hover:bg-accent/50'
                     )}
                  >
                     {candidate === 'issues' ? t('Issues') : t('Projects')}
                  </button>
               ))}
            </div>
            <DisplayOptions />
         </div>

         <div className="flex items-center gap-1 px-6 py-1.5 text-xs text-muted-foreground border-b">
            {t('Name')}
            <ArrowDown className="size-3" />
         </div>

         <div className="flex items-center justify-between px-6 py-2 bg-sidebar/60 border-b border-border/50">
            <span className="flex items-center gap-2 text-sm">
               {team ? (
                  <span className="inline-flex size-5 items-center justify-center rounded bg-muted/50 text-xs">
                     {team.icon}
                  </span>
               ) : (
                  <span className="inline-flex size-5 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-semibold">
                     LN
                  </span>
               )}
               <span className="font-medium">{team ? team.name : 'LNDev UI'}</span>
               <span className="text-muted-foreground text-xs">
                  · {team ? t('Team') : t('Workspace')}
               </span>
            </span>
            <Button size="xs" onClick={() => setNewOpen(true)}>
               <Plus className="size-3.5" />
               {t('New view')}
            </Button>
         </div>

         {list.map((view) => (
            <ViewRow key={view.id} view={view} orgId={orgId} />
         ))}
         {list.length === 0 && (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
               {t('No views yet')}
            </div>
         )}

         <ViewDialog open={newOpen} onOpenChange={setNewOpen} teamId={teamId} />
      </div>
   );
}
