'use client';

import { Issue } from '@/mock-data/issues';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

export const MY_ISSUES_TABS = ['assigned', 'created', 'subscribed', 'activity'] as const;
export type MyIssuesTab = (typeof MY_ISSUES_TABS)[number];

export const MY_ISSUES_TAB_ITEMS: { label: string; value: MyIssuesTab }[] = [
   { label: 'Assigned', value: 'assigned' },
   { label: 'Created', value: 'created' },
   { label: 'Subscribed', value: 'subscribed' },
   { label: 'Activity', value: 'activity' },
];

/** The signed-in user (undefined until the members cache hydrates). */
export function useMe() {
   return useCurrentUser();
}

/** Shared tab state (URL-backed) between the header and the page body. */
export function useMyIssuesTab() {
   return useQueryState('tab', parseAsStringLiteral(MY_ISSUES_TABS).withDefault('assigned'));
}

const createdBy = (issue: Issue, meId: string) => issue.creatorId === meId;
const subscribed = (issue: Issue, meId: string) =>
   issue.assignee?.id === meId || createdBy(issue, meId);

/** Issues shown by each My issues tab (scoped to `meId`). */
export function scopeMyIssues(
   issues: Issue[],
   tab: MyIssuesTab,
   meId: string | undefined
): Issue[] {
   if (!meId) return [];
   switch (tab) {
      case 'assigned':
         return issues.filter((issue) => issue.assignee?.id === meId);
      case 'created':
         return issues.filter((issue) => createdBy(issue, meId));
      case 'subscribed':
         return issues.filter((issue) => subscribed(issue, meId));
      case 'activity':
      default:
         return issues
            .filter((issue) => subscribed(issue, meId))
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
   }
}
