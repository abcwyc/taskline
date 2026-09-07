'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createColumnConfigHelper } from '@/components/data-table-filter/core/filters';
import type { ColumnOption, FiltersState } from '@/components/data-table-filter/core/types';
import { multiOptionFilterFn, optionFilterFn } from '@/components/data-table-filter/lib/filter-fns';
import { Cycle, cycleStatusLabel } from '@/mock-data/cycles';
import { useCyclesStore } from '@/store/cycles-store';
import { Issue } from '@/mock-data/issues';
import { LabelInterface } from '@/mock-data/labels';
import { useLabelsStore } from '@/store/labels-store';
import { priorities } from '@/mock-data/priorities';
import { status, StatusCategory } from '@/mock-data/status';
import { Project } from '@/mock-data/projects';
import { User } from '@/mock-data/users';
import { useMembersStore } from '@/store/members-store';
import { useProjectsStore } from '@/store/projects-store';
import { useMemo } from 'react';
import {
   BarChart3,
   CircleCheck,
   CircleDashed,
   CircleUserRound,
   Folder,
   RefreshCcw,
   Tag,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                Option lists                                */
/* -------------------------------------------------------------------------- */

const statusOptions: ColumnOption[] = status.map((item) => ({
   value: item.id,
   label: item.name,
   icon: <item.icon />,
}));

const STATUS_TYPES: { id: StatusCategory; name: string }[] = [
   { id: 'triage', name: 'Triage' },
   { id: 'backlog', name: 'Backlog' },
   { id: 'unstarted', name: 'Unstarted' },
   { id: 'started', name: 'Started' },
   { id: 'completed', name: 'Completed' },
   { id: 'canceled', name: 'Canceled' },
];

const statusTypeOptions: ColumnOption[] = STATUS_TYPES.map((item) => ({
   value: item.id,
   label: item.name,
   icon: <CircleDashed className="size-4 text-muted-foreground" />,
}));

/** Assignee options are dynamic (members are DB-backed). */
const buildAssigneeOptions = (members: User[]): ColumnOption[] => [
   {
      value: 'unassigned',
      label: 'Unassigned',
      icon: <CircleUserRound className="size-4 text-muted-foreground" />,
   },
   ...members.map((user) => ({
      value: user.id,
      label: user.name,
      icon: (
         <Avatar className="size-4">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
         </Avatar>
      ),
   })),
];

const priorityOptions: ColumnOption[] = priorities.map((priority) => ({
   value: priority.id,
   label: priority.name,
   icon: <priority.icon className="size-4 text-muted-foreground" />,
}));

const buildLabelOptions = (list: LabelInterface[]): ColumnOption[] =>
   list.map((label) => ({
      value: label.id,
      label: label.name,
      icon: <span className="size-2.5 rounded-full" style={{ backgroundColor: label.color }} />,
   }));

/** Project options are the only dynamic list (projects are DB-backed). */
const buildProjectOptions = (projectList: Project[]): ColumnOption[] =>
   projectList.map((project) => ({
      value: project.id,
      label: project.name,
      icon: <project.icon className="size-4 text-muted-foreground" />,
   }));

const buildCycleOptions = (list: Cycle[]): ColumnOption[] => [
   {
      value: 'no-cycle',
      label: 'No cycle',
      icon: <RefreshCcw className="size-4 text-muted-foreground" />,
   },
   ...list.map((cycle) => ({
      value: cycle.id,
      label: `${cycle.name} (${cycleStatusLabel[cycle.status]})`,
      icon: <RefreshCcw className="size-4 text-muted-foreground" />,
   })),
];

/* -------------------------------------------------------------------------- */
/*                              Column definitions                            */
/* -------------------------------------------------------------------------- */

const dtf = createColumnConfigHelper<Issue>();

/**
 * Builds the filterable issue columns for the bazza/ui data-table-filter.
 * `projectOptions` / `assigneeOptions` vary (projects + members are DB-backed);
 * everything else is a static list. Accessors return the raw values the filter
 * functions compare against and never depend on the option lists.
 */
function buildIssueFilterColumns(
   projectOptions: ColumnOption[],
   assigneeOptions: ColumnOption[],
   labelOptions: ColumnOption[],
   cycleOptions: ColumnOption[]
) {
   return [
      dtf
         .option()
         .id('status')
         .accessor((issue: Issue) => issue.status.id)
         .displayName('Status')
         .icon(CircleCheck)
         .options(statusOptions)
         .build(),
      dtf
         .option()
         .id('statusType')
         .accessor((issue: Issue) => issue.status.category)
         .displayName('Status type')
         .icon(CircleDashed)
         .options(statusTypeOptions)
         .build(),
      dtf
         .option()
         .id('assignee')
         .accessor((issue: Issue) => issue.assignee?.id ?? 'unassigned')
         .displayName('Assignee')
         .icon(CircleUserRound)
         .options(assigneeOptions)
         .build(),
      dtf
         .option()
         .id('priority')
         .accessor((issue: Issue) => issue.priority.id)
         .displayName('Priority')
         .icon(BarChart3)
         .options(priorityOptions)
         .build(),
      dtf
         .multiOption()
         .id('labels')
         .accessor((issue: Issue) => issue.labels.map((label) => label.id))
         .displayName('Labels')
         .icon(Tag)
         .options(labelOptions)
         .build(),
      dtf
         .option()
         .id('project')
         .accessor((issue: Issue) => issue.project?.id ?? '')
         .displayName('Project')
         .icon(Folder)
         .options(projectOptions)
         .build(),
      dtf
         .option()
         .id('cycle')
         .accessor((issue: Issue) => (issue.cycleId === '' ? 'no-cycle' : issue.cycleId))
         .displayName('Cycle')
         .icon(RefreshCcw)
         .options(cycleOptions)
         .build(),
   ];
}

/**
 * Static accessors/operators used by `applyIssueFilters`. Options are supplied
 * by `useIssueFilterColumns` from the persisted workspace stores.
 */
export const issueFilterColumns = buildIssueFilterColumns([], [], [], []);

/** Filter-UI columns with the live (DB-backed) project / member / label / cycle lists. */
export function useIssueFilterColumns() {
   const projectList = useProjectsStore((s) => s.projects);
   const memberList = useMembersStore((s) => s.members);
   const labelList = useLabelsStore((s) => s.labels);
   const cycleList = useCyclesStore((s) => s.cycles);
   return useMemo(
      () =>
         buildIssueFilterColumns(
            buildProjectOptions(projectList),
            buildAssigneeOptions(memberList),
            buildLabelOptions(labelList),
            buildCycleOptions(cycleList)
         ),
      [projectList, memberList, labelList, cycleList]
   );
}

const columnById = new Map<string, (typeof issueFilterColumns)[number]>(
   issueFilterColumns.map((column) => [column.id, column])
);

/**
 * Applies a bazza/ui FiltersState to a list of issues, honoring the
 * operator of each filter (is / is not / include / exclude / …).
 */
export function applyIssueFilters(issues: Issue[], filters: FiltersState): Issue[] {
   if (filters.length === 0) return issues;

   return issues.filter((issue) =>
      filters.every((filter) => {
         const column = columnById.get(filter.columnId);
         if (!column) return true;

         const value = column.accessor(issue);
         switch (filter.type) {
            case 'option':
               return optionFilterFn(String(value ?? ''), filter) ?? true;
            case 'multiOption':
               return multiOptionFilterFn((value as string[]) ?? [], filter) ?? true;
            default:
               return true;
         }
      })
   );
}
