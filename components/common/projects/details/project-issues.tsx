'use client';

import { GroupedIssuesView } from '@/components/common/issues/grouped-issues-view';
import { applyIssueFilters } from '@/components/common/issues/issue-filter-columns';
import { IssueFilterBar } from '@/components/common/issues/issue-filter-bar';
import { displayOrderedStatus } from '@/mock-data/status';
import { useFilterStore } from '@/store/filter-store';
import { useIssuesStore } from '@/store/issues-store';
import { useProjectsStore } from '@/store/projects-store';
import { useProjectDetail } from '@/store/project-details-store';
import { useMemo } from 'react';
import { useLanguage } from '@/components/providers/language-provider';
import { ProjectSidePanel } from './project-side-panel';

interface ProjectIssuesProps {
   projectId: string;
}

/** Project "Issues" tab: the project's issues grouped by status. */
export default function ProjectIssues({ projectId }: ProjectIssuesProps) {
   const { t } = useLanguage();
   const project = useProjectsStore((s) => s.getProjectById(projectId));
   const detail = useProjectDetail(projectId);
   const { issues: allIssues } = useIssuesStore();
   const { filters } = useFilterStore();

   const issues = useMemo(
      () => allIssues.filter((issue) => issue.project?.id === projectId),
      [allIssues, projectId]
   );

   // Filters (filter bar + click-to-filter from the insights panel) apply
   // on top of the project scope.
   const displayedIssues = useMemo(() => applyIssueFilters(issues, filters), [issues, filters]);

   if (!project) {
      return <div className="p-10 text-sm text-muted-foreground">{t('Loading project…')}</div>;
   }

   return (
      <div className="w-full h-full flex flex-col overflow-hidden">
         <IssueFilterBar />
         <div className="flex-1 min-h-0 w-full flex overflow-hidden">
            <div className="flex-1 min-w-0 h-full overflow-hidden">
               <GroupedIssuesView
                  issues={displayedIssues}
                  totalIssues={issues}
                  statuses={displayOrderedStatus}
                  isViewTypeGrid={false}
               />
            </div>
            <ProjectSidePanel
               project={project}
               detail={detail}
               issues={issues}
               insightsIssues={displayedIssues}
            />
         </div>
      </div>
   );
}
