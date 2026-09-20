'use client';

import { useProjectsDisplayStore } from '@/store/projects-display-store';
import ProjectLine from './project-line';
import { ProjectGroup } from './projects';
import { useLanguage } from '@/components/providers/language-provider';

/** Projects "List" view: grouped table (team sections by default). */
export default function ProjectsList({ groups }: { groups: ProjectGroup[] }) {
   const { grouping, displayProperties } = useProjectsDisplayStore();
   const { t } = useLanguage();

   return (
      <div className="w-full h-full overflow-y-auto">
         <div className="bg-container px-6 py-1.5 text-sm flex items-center text-muted-foreground border-b sticky top-0 z-10">
            <div className="flex-1 min-w-0">{t('Name')}</div>
            {displayProperties.health && (
               <div className="hidden sm:block w-[120px] shrink-0 pl-2">{t('Health')}</div>
            )}
            {displayProperties.priority && (
               <div className="hidden md:block w-[70px] shrink-0 pl-2">{t('Priority')}</div>
            )}
            {displayProperties.lead && (
               <div className="hidden xl:block w-[130px] shrink-0 pl-2">{t('Lead')}</div>
            )}
            {displayProperties.targetDate && (
               <div className="hidden xl:block w-[132px] shrink-0 pl-2.5">{t('Target date')}</div>
            )}
            {displayProperties.issues && (
               <div className="hidden xl:block w-[60px] shrink-0 pl-2.5">{t('Issues')}</div>
            )}
            {displayProperties.status && (
               <div className="w-[90px] shrink-0 pl-2">{t('Status')}</div>
            )}
         </div>

         {groups.map((group) => (
            <div key={group.id}>
               {grouping !== 'none' && (
                  <div className="flex items-center gap-2 px-6 h-9 text-sm font-medium bg-[color-mix(in_oklab,var(--accent)_30%,var(--container))] border-b border-border/40 sticky top-8 z-[9]">
                     {group.icon && <span>{group.icon}</span>}
                     {group.name}
                     <span className="text-xs text-muted-foreground">{group.projects.length}</span>
                  </div>
               )}
               {group.projects.map((project) => (
                  <ProjectLine key={project.id} project={project} />
               ))}
               {group.projects.length === 0 && (
                  <div className="px-6 py-3 text-xs text-muted-foreground border-b border-border/40">
                     {t('No projects')}
                  </div>
               )}
            </div>
         ))}
      </div>
   );
}
