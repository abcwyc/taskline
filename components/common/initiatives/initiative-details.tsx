'use client';

import ProjectsTimeline from '@/components/common/projects/projects-timeline';
import { ProjectGroup } from '@/components/common/projects/projects';
import { useLanguage } from '@/components/providers/language-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatAppDate, type AppLocale } from '@/lib/i18n';
import type { Initiative } from '@/mock-data/initiatives';
import { INITIATIVE_STATUS_META } from '@/mock-data/initiatives';
import {
   countCompletedProjects,
   getInitiativeProjects,
   useInitiativesStore,
} from '@/store/initiatives-store';
import { Project } from '@/mock-data/projects';
import {
   CalendarRange,
   ChevronDown,
   FilePenLine,
   FileText,
   Plus,
   Tag,
   UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { InitiativeProgressPanel } from './initiative-progress-panel';
import { InitiativeStatusIcon } from './initiative-status-icon';

const TABS = ['overview', 'activity', 'projects'] as const;

const formatTarget = (locale: AppLocale, iso: string): string =>
   formatAppDate(locale, iso, 'MMM d');

/* ------------------------------ projects table ---------------------------- */

const GROUP_ORDER: { key: string; label: string; match: (project: Project) => boolean }[] = [
   { key: 'in-progress', label: 'In Progress', match: (p) => p.status.category === 'started' },
   { key: 'planned', label: 'Planned', match: (p) => p.status.category === 'unstarted' },
   {
      key: 'backlog',
      label: 'Backlog',
      match: (p) => p.status.category === 'backlog' || p.status.category === 'triage',
   },
   { key: 'completed', label: 'Completed', match: (p) => p.status.category === 'completed' },
];

function ProjectsSection({ initiative }: { initiative: Initiative }) {
   const { locale, t } = useLanguage();
   const { orgId } = useParams<{ orgId: string }>();
   const projects = getInitiativeProjects(initiative);
   const groups = GROUP_ORDER.map((group) => ({
      ...group,
      projects: projects.filter(group.match),
   })).filter((group) => group.projects.length > 0);

   return (
      <section className="flex flex-col gap-2">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{t('Projects')}</h2>
            <Plus className="size-4 text-muted-foreground" />
         </div>
         <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground border-b">
            <span className="flex-1">{t('Name')}</span>
            <span className="hidden sm:block w-16 shrink-0">{t('Health')}</span>
            <span className="hidden sm:block w-16 shrink-0">{t('Priority')}</span>
            <span className="hidden md:block w-12 shrink-0">{t('Lead')}</span>
            <span className="hidden md:block w-24 shrink-0">{t('Target date')}</span>
            <span className="w-16 shrink-0">{t('Status')}</span>
         </div>
         {groups.map((group) => (
            <div key={group.key} className="flex flex-col">
               <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
                  <ChevronDown className="size-3" />
                  {t(group.label)}
                  <span className="flex-1 border-b border-border/60" />
               </div>
               {group.projects.map((project) => (
                  <Link
                     key={project.id}
                     href={`/${orgId}/project/${project.id}/overview`}
                     className="flex items-center gap-2 py-2 text-sm hover:bg-sidebar/50 rounded-md px-1 -mx-1 transition-colors"
                  >
                     <project.icon className="size-4 text-muted-foreground shrink-0" />
                     <span className="flex-1 truncate font-medium">{project.name}</span>
                     <span className="hidden sm:block w-16 shrink-0">
                        <span
                           className="size-2.5 rounded-full inline-block"
                           style={{ backgroundColor: project.health.color }}
                        />
                     </span>
                     <span className="hidden sm:block w-16 shrink-0">
                        <project.priority.icon className="size-4 text-muted-foreground" />
                     </span>
                     <span className="hidden md:block w-12 shrink-0">
                        <Avatar className="size-5">
                           <AvatarImage src={project.lead.avatarUrl} alt={project.lead.name} />
                           <AvatarFallback className="text-[9px]">
                              {project.lead.name[0]}
                           </AvatarFallback>
                        </Avatar>
                     </span>
                     <span className="hidden md:flex items-center gap-1 w-24 shrink-0 text-xs text-muted-foreground">
                        {project.targetDate ? (
                           <>
                              <CalendarRange className="size-3.5" />
                              {formatTarget(locale, project.targetDate)}
                           </>
                        ) : (
                           '—'
                        )}
                     </span>
                     <span className="w-16 shrink-0 text-xs text-muted-foreground">
                        {project.percentComplete}%
                     </span>
                  </Link>
               ))}
            </div>
         ))}
      </section>
   );
}

/* ------------------------------- overview tab ----------------------------- */

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
   return (
      <div className="flex items-center gap-2 text-sm">
         <span className="w-24 text-muted-foreground text-xs shrink-0">{label}</span>
         {children}
      </div>
   );
}

/** Right rail shared by the Overview and Projects tabs: properties, progress, activity. */
function InitiativeAside({ initiative }: { initiative: Initiative }) {
   const { locale, t } = useLanguage();
   const completed = countCompletedProjects(initiative);
   const total = initiative.projectIds.length;

   return (
      <aside className="hidden lg:flex flex-col w-80 shrink-0 border-l h-full overflow-y-auto p-5 gap-6 bg-container">
         <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">{t('Properties')}</span>
            <PropertyRow label={t('Status')}>
               <span className="inline-flex items-center gap-1.5">
                  <InitiativeStatusIcon status={initiative.status} />
                  {t(INITIATIVE_STATUS_META[initiative.status].label)}
               </span>
            </PropertyRow>
            <PropertyRow label={t('Priority')}>
               <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <initiative.priority.icon className="size-4" />
                  {t(initiative.priority.name)}
               </span>
            </PropertyRow>
            <PropertyRow label={t('Owner')}>
               {initiative.owner ? (
                  <span className="inline-flex items-center gap-1.5">
                     <Avatar className="size-4">
                        <AvatarImage src={initiative.owner.avatarUrl} alt={initiative.owner.name} />
                        <AvatarFallback className="text-[8px]">
                           {initiative.owner.name[0]}
                        </AvatarFallback>
                     </Avatar>
                     {initiative.owner.name}
                  </span>
               ) : (
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                     <UserRound className="size-4" /> {t('Add owner')}
                  </span>
               )}
            </PropertyRow>
            <PropertyRow label={t('Target date')}>
               <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <CalendarRange className="size-4" />
                  {initiative.target ?? t('Add target date')}
               </span>
            </PropertyRow>
            <PropertyRow label={t('Labels')}>
               <span className="text-muted-foreground inline-flex items-center gap-1.5">
                  <Tag className="size-4" /> {t('Add label')}
               </span>
            </PropertyRow>
            <PropertyRow label={t('Projects')}>
               <span className="text-muted-foreground text-xs">
                  {completed} / {total} {t('completed')}
               </span>
            </PropertyRow>
         </div>

         <InitiativeProgressPanel initiative={initiative} />

         <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
               <span className="text-sm font-medium">{t('Activity')}</span>
            </div>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
               <span className="flex items-start gap-2">
                  <FilePenLine className="size-3.5 mt-px shrink-0" />
                  {initiative.owner?.name ?? t('someone')} {t('renamed the initiative')} ·{' '}
                  {formatTarget(locale, initiative.createdAt)}
               </span>
               <span className="flex items-start gap-2">
                  <FileText className="size-3.5 mt-px shrink-0" />
                  {initiative.owner?.name ?? t('someone')} {t('created the initiative')} ·{' '}
                  {formatTarget(locale, initiative.createdAt)}
               </span>
            </div>
         </div>
      </aside>
   );
}

function Overview({ initiative }: { initiative: Initiative }) {
   const { t } = useLanguage();
   return (
      <div className="w-full h-full flex overflow-hidden">
         <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-10 flex flex-col gap-6">
               <span className="inline-flex size-10 items-center justify-center rounded-md bg-muted/50 text-2xl">
                  {initiative.icon}
               </span>
               <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-semibold">{initiative.name}</h1>
                  <p className="text-sm text-muted-foreground">
                     {initiative.description ?? t('Add a short summary…')}
                  </p>
               </div>

               <div className="flex items-center gap-3 flex-wrap text-sm">
                  <span className="text-muted-foreground text-xs w-24">{t('Properties')}</span>
                  <span className="inline-flex items-center gap-1.5">
                     <InitiativeStatusIcon status={initiative.status} />
                     {t(INITIATIVE_STATUS_META[initiative.status].label)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                     <initiative.priority.icon className="size-4" />
                     {t(initiative.priority.name)}
                  </span>
                  {initiative.owner ? (
                     <span className="inline-flex items-center gap-1.5">
                        <Avatar className="size-4">
                           <AvatarImage
                              src={initiative.owner.avatarUrl}
                              alt={initiative.owner.name}
                           />
                           <AvatarFallback className="text-[8px]">
                              {initiative.owner.name[0]}
                           </AvatarFallback>
                        </Avatar>
                        {initiative.owner.name}
                     </span>
                  ) : (
                     <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <UserRound className="size-4" /> {t('Owner')}
                     </span>
                  )}
                  {initiative.target && (
                     <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <CalendarRange className="size-4" />
                        {initiative.target}
                     </span>
                  )}
               </div>

               <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground text-xs w-24">{t('Resources')}</span>
               </div>

               <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
                  {t('Initiative updates are not supported in this build yet.')}
               </p>

               <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-medium">{t('Description')}</h2>
                  <p className="text-sm text-muted-foreground">
                     {initiative.description ?? t('Add description…')}
                  </p>
               </div>

               <ProjectsSection initiative={initiative} />
            </div>
         </div>

         <InitiativeAside initiative={initiative} />
      </div>
   );
}

/* ------------------------------- activity tab ----------------------------- */

function Activity({ initiative }: { initiative: Initiative }) {
   const { locale, t } = useLanguage();
   const events = [
      {
         label: `${initiative.owner?.name ?? t('someone')} ${t('created the initiative')}`,
         date: formatTarget(locale, initiative.createdAt),
      },
      {
         label: `${initiative.owner?.name ?? t('someone')} ${t('changed the status to')}${t(
            INITIATIVE_STATUS_META[initiative.status].label
         )}`,
         date: formatTarget(locale, initiative.createdAt),
      },
      {
         label: `${initiative.projectIds.length} ${t('projects added to the initiative')}`,
         date: formatTarget(locale, initiative.createdAt),
      },
   ];
   return (
      <div className="max-w-2xl mx-auto px-8 py-10 flex flex-col gap-4 w-full">
         <h2 className="text-lg font-medium">{t('Activity')}</h2>
         <div className="flex flex-col">
            {events.map((event, index) => (
               <div
                  key={index}
                  className="flex items-center gap-3 py-3 border-b border-border/50 text-sm"
               >
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <span className="flex-1">{event.label}</span>
                  <span className="text-xs text-muted-foreground">{event.date}</span>
               </div>
            ))}
         </div>
      </div>
   );
}

/* ---------------------------------- export -------------------------------- */

/** Initiative detail page: Overview / Activity / Projects tabs. */
export default function InitiativeDetails({ initiativeId }: { initiativeId: string }) {
   const { t } = useLanguage();
   const [tab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('overview'));
   const initiative = useInitiativesStore((s) => s.getInitiativeById(initiativeId));

   const timelineGroups = useMemo<ProjectGroup[]>(() => {
      if (!initiative) return [];
      return [
         {
            id: initiative.id,
            name: initiative.name,
            icon: initiative.icon,
            projects: getInitiativeProjects(initiative),
         },
      ];
   }, [initiative]);

   if (!initiative) {
      return (
         <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            {t('Initiative not found')}
         </div>
      );
   }

   if (tab === 'activity') return <Activity initiative={initiative} />;
   if (tab === 'projects') {
      // The Linear layout: timeline on the left, the same rail as the
      // overview (properties, progress chart, activity) on the right.
      return (
         <div className="w-full h-full flex overflow-hidden">
            <div className="flex-1 min-w-0 h-full overflow-hidden">
               <ProjectsTimeline groups={timelineGroups} />
            </div>
            <InitiativeAside initiative={initiative} />
         </div>
      );
   }
   return <Overview initiative={initiative} />;
}
