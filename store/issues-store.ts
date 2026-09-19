import { groupIssuesByStatus, Issue } from '@/mock-data/issues';
import { LabelInterface } from '@/mock-data/labels';
import { Priority } from '@/mock-data/priorities';
import { Project } from '@/mock-data/projects';
import { Status } from '@/mock-data/status';
import { User } from '@/mock-data/users';
import { create } from 'zustand';
import { toast } from 'sonner';

import { createMutationGuard } from '@/lib/client-mutation';
import { useIssueDetailsStore } from '@/store/issue-details-store';
import { useMeStore } from '@/store/me-store';
import { useMembersStore } from '@/store/members-store';
import {
   createIssue as apiCreateIssue,
   deleteIssue as apiDeleteIssue,
   fetchIssues as apiFetchIssues,
   issuePatchToBody,
   issueToCreateBody,
   updateIssue as apiUpdateIssue,
} from '@/lib/api/issues';

interface FilterOptions {
   status?: string[];
   assignee?: string[];
   priority?: string[];
   labels?: string[];
   project?: string[];
   cycle?: string[];
   statusType?: string[];
}

interface IssuesState {
   // Data
   issues: Issue[];
   issuesByStatus: Record<string, Issue[]>;

   // Loading lifecycle (new — the mock version was synchronous)
   hydrated: boolean;
   isLoading: boolean;
   error: string | null;
   hydrate: (force?: boolean) => Promise<void>;

   //
   getAllIssues: () => Issue[];

   // Actions (unchanged signatures — now optimistic + persisted)
   /** Creates the issue and resolves with the persisted issue (null on failure). */
   addIssue: (issue: Issue, parentId?: string) => Promise<Issue | null>;
   /** Insert an issue that was already created server-side (no POST). */
   receiveIssue: (issue: Issue) => void;
   updateIssue: (id: string, updatedIssue: Partial<Issue>) => void;
   deleteIssue: (id: string) => void;

   // Filters (pure, client-side — unchanged)
   filterByStatus: (statusId: string) => Issue[];
   filterByPriority: (priorityId: string) => Issue[];
   filterByAssignee: (userId: string | null) => Issue[];
   filterByLabel: (labelId: string) => Issue[];
   filterByProject: (projectId: string) => Issue[];
   filterByCycle: (cycleId: string) => Issue[];
   searchIssues: (query: string) => Issue[];
   filterIssues: (filters: FilterOptions) => Issue[];

   // Convenience mutators (delegate to updateIssue)
   updateIssueStatus: (issueId: string, newStatus: Status) => void;
   updateIssuePriority: (issueId: string, newPriority: Priority) => void;
   updateIssueAssignee: (issueId: string, newAssignee: User | null) => void;
   addIssueLabel: (issueId: string, label: LabelInterface) => void;
   removeIssueLabel: (issueId: string, labelId: string) => void;
   updateIssueProject: (issueId: string, newProject: Project | undefined) => void;

   getIssueById: (id: string) => Issue | undefined;
}

const bySortedRank = (a: Issue, b: Issue) => b.rank.localeCompare(a.rank);

/** Recompute the derived `issuesByStatus` bucket whenever `issues` changes. */
function withDerived(issues: Issue[]) {
   const sorted = [...issues].sort(bySortedRank);
   return { issues: sorted, issuesByStatus: groupIssuesByStatus(sorted) };
}

export const useIssuesStore = create<IssuesState>((set, get) => {
   const mutations = createMutationGuard();
   return {
      // Initial state — empty until `hydrate()` runs (see <IssuesProvider>)
      issues: [],
      issuesByStatus: {},
      hydrated: false,
      isLoading: false,
      error: null,

      hydrate: async (force = false) => {
         const firstLoad = !get().hydrated;
         if ((!force && !firstLoad) || get().isLoading || (force && mutations.hasActive())) return;
         set({ isLoading: true, error: null });
         try {
            const issues = await apiFetchIssues();
            set({ ...withDerived(issues), hydrated: true, isLoading: false });
         } catch (err) {
            set({ isLoading: false, error: (err as Error).message });
            if (firstLoad) {
               toast.error('Failed to load issues');
               throw err;
            }
         }
      },

      getAllIssues: () => get().issues,

      /* ------------------------------- create ------------------------------- */
      addIssue: (issue: Issue, parentId?: string) => {
         set(withDerived([...get().issues, issue]));
         const version = mutations.begin(issue.id);
         return apiCreateIssue(issueToCreateBody(issue, parentId))
            .then((saved) => {
               if (mutations.isCurrent(issue.id, version)) {
                  set(withDerived(get().issues.map((i) => (i.id === issue.id ? saved : i))));
                  if (parentId) useIssueDetailsStore.getState().invalidate(parentId);
                  mutations.finish(issue.id, version);
               }
               return saved;
            })
            .catch((err) => {
               if (mutations.isCurrent(issue.id, version)) {
                  set(withDerived(get().issues.filter((i) => i.id !== issue.id)));
                  mutations.finish(issue.id, version);
               }
               toast.error('Failed to create issue');
               console.error(err);
               return null;
            });
      },

      receiveIssue: (issue: Issue) => {
         if (get().issues.some((i) => i.id === issue.id)) return;
         set(withDerived([...get().issues, issue]));
      },

      updateIssue: (id: string, updatedIssue: Partial<Issue>) => {
         const snapshot = get().issues.find((i) => i.id === id);
         if (!snapshot) return;

         set(withDerived(get().issues.map((i) => (i.id === id ? { ...i, ...updatedIssue } : i))));
         const version = mutations.begin(id);
         apiUpdateIssue(id, issuePatchToBody(updatedIssue))
            .then((saved) => {
               if (!mutations.isCurrent(id, version)) return;
               set(withDerived(get().issues.map((i) => (i.id === id ? saved : i))));
               mutations.finish(id, version);
            })
            .catch((err) => {
               if (!mutations.isCurrent(id, version)) return;
               set(withDerived(get().issues.map((i) => (i.id === id ? snapshot : i))));
               toast.error('Failed to save changes');
               console.error(err);
               mutations.finish(id, version);
            });
      },

      deleteIssue: (id) => {
         const snapshot = get().issues;
         set(withDerived(snapshot.filter((i) => i.id !== id)));
         const version = mutations.begin(id);
         apiDeleteIssue(id)
            .then(() => mutations.finish(id, version))
            .catch((err) => {
               if (!mutations.isCurrent(id, version)) return;
               set(withDerived(snapshot));
               toast.error('Failed to delete issue');
               console.error(err);
               mutations.finish(id, version);
            });
      },

      /* ------------------------------ filters ------------------------------- */
      filterByStatus: (statusId: string) =>
         get().issues.filter((issue) => issue.status.id === statusId),

      filterByPriority: (priorityId: string) =>
         get().issues.filter((issue) => issue.priority.id === priorityId),

      filterByAssignee: (userId: string | null) => {
         if (userId === null) return get().issues.filter((issue) => issue.assignee === null);
         return get().issues.filter((issue) => issue.assignee?.id === userId);
      },

      filterByLabel: (labelId: string) =>
         get().issues.filter((issue) => issue.labels.some((label) => label.id === labelId)),

      filterByProject: (projectId: string) =>
         get().issues.filter((issue) => issue.project?.id === projectId),

      filterByCycle: (cycleId: string) => get().issues.filter((issue) => issue.cycleId === cycleId),

      searchIssues: (query: string) => {
         const q = query.toLowerCase();
         return get().issues.filter(
            (issue) =>
               issue.title.toLowerCase().includes(q) || issue.identifier.toLowerCase().includes(q)
         );
      },

      filterIssues: (filters: FilterOptions) => {
         let filteredIssues = get().issues;

         if (filters.status && filters.status.length > 0) {
            filteredIssues = filteredIssues.filter((issue) =>
               filters.status!.includes(issue.status.id)
            );
         }

         if (filters.assignee && filters.assignee.length > 0) {
            filteredIssues = filteredIssues.filter((issue) => {
               if (filters.assignee!.includes('unassigned') && issue.assignee === null) {
                  return true;
               }
               return issue.assignee && filters.assignee!.includes(issue.assignee.id);
            });
         }

         if (filters.priority && filters.priority.length > 0) {
            filteredIssues = filteredIssues.filter((issue) =>
               filters.priority!.includes(issue.priority.id)
            );
         }

         if (filters.labels && filters.labels.length > 0) {
            filteredIssues = filteredIssues.filter((issue) =>
               issue.labels.some((label) => filters.labels!.includes(label.id))
            );
         }

         if (filters.project && filters.project.length > 0) {
            filteredIssues = filteredIssues.filter(
               (issue) => issue.project && filters.project!.includes(issue.project.id)
            );
         }

         if (filters.cycle && filters.cycle.length > 0) {
            filteredIssues = filteredIssues.filter((issue) => {
               if (filters.cycle!.includes('no-cycle') && issue.cycleId === '') return true;
               return filters.cycle!.includes(issue.cycleId);
            });
         }

         if (filters.statusType && filters.statusType.length > 0) {
            filteredIssues = filteredIssues.filter((issue) =>
               filters.statusType!.includes(issue.status.category)
            );
         }

         return filteredIssues;
      },

      /* ----------------------- convenience mutators ------------------------ */
      updateIssueStatus: (issueId, newStatus) => {
         const patch: Partial<Issue> = { status: newStatus };
         // Preference: moving an unassigned issue to a started status assigns it to me.
         if (newStatus.category === 'started') {
            const issue = get().getIssueById(issueId);
            const me = useMeStore.getState();
            if (issue && !issue.assignee && me.preferences.assignSelfOnStart && me.me) {
               const self = useMembersStore.getState().getMemberById(me.me.id);
               if (self) patch.assignee = self;
            }
         }
         get().updateIssue(issueId, patch);
      },
      updateIssuePriority: (issueId, newPriority) =>
         get().updateIssue(issueId, { priority: newPriority }),
      updateIssueAssignee: (issueId, newAssignee) =>
         get().updateIssue(issueId, { assignee: newAssignee }),

      addIssueLabel: (issueId, label) => {
         const issue = get().getIssueById(issueId);
         if (issue) get().updateIssue(issueId, { labels: [...issue.labels, label] });
      },

      removeIssueLabel: (issueId, labelId) => {
         const issue = get().getIssueById(issueId);
         if (issue) {
            get().updateIssue(issueId, {
               labels: issue.labels.filter((label) => label.id !== labelId),
            });
         }
      },

      updateIssueProject: (issueId, newProject) =>
         get().updateIssue(issueId, { project: newProject }),

      getIssueById: (id: string) => get().issues.find((issue) => issue.id === id),
   };
});
