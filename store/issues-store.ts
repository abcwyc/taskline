import { groupIssuesByStatus, Issue } from '@/mock-data/issues';
import { LabelInterface } from '@/mock-data/labels';
import { Priority } from '@/mock-data/priorities';
import { Project } from '@/mock-data/projects';
import { Status } from '@/mock-data/status';
import { User } from '@/mock-data/users';
import { create } from 'zustand';
import { toast } from 'sonner';

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
   hydrate: () => Promise<void>;

   //
   getAllIssues: () => Issue[];

   // Actions (unchanged signatures — now optimistic + persisted)
   addIssue: (issue: Issue) => void;
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

export const useIssuesStore = create<IssuesState>((set, get) => ({
   // Initial state — empty until `hydrate()` runs (see <IssuesProvider>)
   issues: [],
   issuesByStatus: {},
   hydrated: false,
   isLoading: false,
   error: null,

   hydrate: async () => {
      if (get().hydrated || get().isLoading) return;
      set({ isLoading: true, error: null });
      try {
         const issues = await apiFetchIssues();
         set({ ...withDerived(issues), hydrated: true, isLoading: false });
      } catch (err) {
         set({ isLoading: false, error: (err as Error).message });
         toast.error('Failed to load issues');
      }
   },

   getAllIssues: () => get().issues,

   /* ------------------------------- create ------------------------------- */
   addIssue: (issue: Issue) => {
      // optimistic: show the client-built issue immediately
      set(withDerived([...get().issues, issue]));

      apiCreateIssue(issueToCreateBody(issue))
         .then((saved) => {
            // swap the temp row for the authoritative one (real id / identifier / rank)
            set(withDerived(get().issues.map((i) => (i.id === issue.id ? saved : i))));
         })
         .catch((err) => {
            set(withDerived(get().issues.filter((i) => i.id !== issue.id)));
            toast.error('Failed to create issue');
            console.error(err);
         });
   },

   receiveIssue: (issue: Issue) => {
      if (get().issues.some((i) => i.id === issue.id)) return;
      set(withDerived([...get().issues, issue]));
   },

   /* ------------------------------- update ------------------------------- */
   updateIssue: (id: string, updatedIssue: Partial<Issue>) => {
      const snapshot = get().issues.find((i) => i.id === id);
      if (!snapshot) return;

      set(withDerived(get().issues.map((i) => (i.id === id ? { ...i, ...updatedIssue } : i))));

      apiUpdateIssue(id, issuePatchToBody(updatedIssue))
         .then((saved) => {
            set(withDerived(get().issues.map((i) => (i.id === id ? saved : i))));
         })
         .catch((err) => {
            set(withDerived(get().issues.map((i) => (i.id === id ? snapshot : i))));
            toast.error('Failed to save changes');
            console.error(err);
         });
   },

   /* ------------------------------- delete ------------------------------- */
   deleteIssue: (id: string) => {
      const snapshot = get().issues;
      set(withDerived(snapshot.filter((i) => i.id !== id)));

      apiDeleteIssue(id).catch((err) => {
         set(withDerived(snapshot));
         toast.error('Failed to delete issue');
         console.error(err);
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
   updateIssueStatus: (issueId, newStatus) => get().updateIssue(issueId, { status: newStatus }),
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

   updateIssueProject: (issueId, newProject) => get().updateIssue(issueId, { project: newProject }),

   getIssueById: (id: string) => get().issues.find((issue) => issue.id === id),
}));
