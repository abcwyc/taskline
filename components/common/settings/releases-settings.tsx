'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Check } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ProjectMilestone } from '@/mock-data/project-details';
import { useProjectDetailsStore } from '@/store/project-details-store';
import { useProjectsStore } from '@/store/projects-store';
import { SettingsCard, SettingsSection, SettingsStatCard } from './shared';

interface ReleaseRow {
   projectId: string;
   projectName: string;
   milestone: ProjectMilestone;
}

/** Workspace "Releases" settings: every project milestone on one timeline. */
export default function ReleasesSettings() {
   const { orgId } = useParams<{ orgId: string }>();
   const projects = useProjectsStore((s) => s.projects);
   const detailsById = useProjectDetailsStore((s) => s.detailsById);
   const ensureDetail = useProjectDetailsStore((s) => s.ensureDetail);
   const toggleMilestone = useProjectDetailsStore((s) => s.toggleMilestone);

   // Fetch each project's detail once (the store dedupes in-flight requests).
   useEffect(() => {
      for (const project of projects) ensureDetail(project.id);
   }, [projects, ensureDetail]);

   const loadedProjects = useMemo(
      () => projects.filter((p) => detailsById[p.id] !== undefined),
      [projects, detailsById]
   );

   const rows = useMemo<ReleaseRow[]>(
      () =>
         loadedProjects.flatMap((project) =>
            (detailsById[project.id]?.milestones ?? []).map((milestone) => ({
               projectId: project.id,
               projectName: project.name,
               milestone,
            }))
         ),
      [loadedProjects, detailsById]
   );

   /* Group by target date (unscheduled last), sorted ascending. */
   const groups = useMemo(() => {
      const byDate = new Map<string, ReleaseRow[]>();
      for (const row of rows) {
         const key = row.milestone.targetDate ?? '';
         byDate.set(key, [...(byDate.get(key) ?? []), row]);
      }
      return [...byDate.entries()]
         .sort((a, b) => {
            if (!a[0]) return 1;
            if (!b[0]) return -1;
            return a[0].localeCompare(b[0]);
         })
         .map(([date, items]) => ({
            date,
            label: date ? format(parseISO(date), 'MMM d, yyyy') : 'No date',
            items: items.sort(
               (a, b) =>
                  a.projectName.localeCompare(b.projectName) ||
                  a.milestone.name.localeCompare(b.milestone.name)
            ),
         }));
   }, [rows]);

   const shipped = rows.filter((r) => r.milestone.completed).length;
   const allLoaded = projects.length > 0 && loadedProjects.length === projects.length;

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-4xl mx-auto px-6 py-10 pb-20">
            <h1 className="text-2xl font-medium">Releases</h1>
            <p className="text-sm text-muted-foreground mt-1">
               Milestones across every project in this workspace, grouped by target date.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-8">
               <SettingsStatCard label="Total milestones" value={rows.length} />
               <SettingsStatCard label="Shipped" value={shipped} />
               <SettingsStatCard label="Upcoming" value={rows.length - shipped} />
            </div>

            <div className="flex flex-col gap-8 mt-10">
               {groups.map((group) => (
                  <SettingsSection key={group.label} title={group.label}>
                     <SettingsCard>
                        {group.items.map(({ projectId, projectName, milestone }) => (
                           <div
                              key={`${projectId}-${milestone.id}`}
                              className="flex items-center gap-3 px-4 py-3 text-sm"
                           >
                              <button
                                 type="button"
                                 onClick={() =>
                                    toggleMilestone(projectId, milestone.id, !milestone.completed)
                                 }
                                 className={cn(
                                    'size-4 rounded-full shrink-0 transition-colors',
                                    milestone.completed
                                       ? 'bg-violet-500 flex items-center justify-center'
                                       : 'border border-muted-foreground/40 hover:border-violet-500'
                                 )}
                                 aria-label={
                                    milestone.completed
                                       ? 'Mark milestone as not done'
                                       : 'Mark milestone as done'
                                 }
                              >
                                 {milestone.completed && <Check className="size-2.5 text-white" />}
                              </button>
                              <span
                                 className={cn(
                                    'text-sm truncate',
                                    milestone.completed && 'text-muted-foreground line-through'
                                 )}
                              >
                                 {milestone.name}
                              </span>
                              <Link
                                 href={`/${orgId}/project/${projectId}/overview`}
                                 className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
                              >
                                 {projectName}
                              </Link>
                           </div>
                        ))}
                     </SettingsCard>
                  </SettingsSection>
               ))}

               {groups.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                     {allLoaded
                        ? 'No releases yet. Add milestones to a project to see them here.'
                        : 'Loading milestones…'}
                  </p>
               )}
            </div>
         </div>
      </div>
   );
}
