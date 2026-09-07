import { Issue } from '@/mock-data/issues';
import { Project } from '@/mock-data/projects';
import type { View } from '@/mock-data/views';
import { create } from 'zustand';
import { toast } from 'sonner';

import {
   createView as apiCreate,
   deleteView as apiDelete,
   fetchViews as apiFetch,
   updateView as apiUpdate,
   viewPatchToBody,
} from '@/lib/api/views';
import type { ViewCreateBody } from '@/lib/api/types';
import { useIssuesStore } from '@/store/issues-store';
import { useProjectsStore } from '@/store/projects-store';

/** Apply a view's declarative filter — drop-in for the old mock-data helpers. */
export function filterIssuesForView(view: View, source?: Issue[]): Issue[] {
   const list = source ?? useIssuesStore.getState().issues;
   const f = view.filter;
   return list.filter((issue) => {
      if (f.statusCategories && !f.statusCategories.includes(issue.status.category)) return false;
      if (f.statusIds && !f.statusIds.includes(issue.status.id)) return false;
      if (f.labelIds && !issue.labels.some((l) => f.labelIds?.includes(l.id))) return false;
      if (f.priorityIds && !f.priorityIds.includes(issue.priority.id)) return false;
      if (f.hasProject && !issue.project) return false;
      if (f.unassigned && issue.assignee) return false;
      return true;
   });
}

export function filterProjectsForView(view: View, source?: Project[]): Project[] {
   const list = source ?? useProjectsStore.getState().projects;
   const f = view.filter;
   return list.filter((project) => {
      if (f.statusCategories && !f.statusCategories.includes(project.status.category)) return false;
      if (f.priorityIds && !f.priorityIds.includes(project.priority.id)) return false;
      return true;
   });
}

interface ViewsState {
   views: View[];
   hydrated: boolean;
   isLoading: boolean;
   error: string | null;
   hydrate: () => Promise<void>;

   getAllViews: () => View[];
   getViewById: (id: string) => View | undefined;
   getViewsByTeam: (teamId: string) => View[];
   issueViews: () => View[];
   projectViews: () => View[];

   createView: (input: ViewCreateBody) => Promise<View | null>;
   updateView: (id: string, patch: Partial<View>) => void;
   deleteView: (id: string) => void;
}

export const useViewsStore = create<ViewsState>((set, get) => ({
   views: [],
   hydrated: false,
   isLoading: false,
   error: null,

   hydrate: async () => {
      if (get().hydrated || get().isLoading) return;
      set({ isLoading: true, error: null });
      try {
         set({ views: await apiFetch(), hydrated: true, isLoading: false });
      } catch (err) {
         set({ isLoading: false, error: (err as Error).message });
         toast.error('Failed to load views');
         throw err;
      }
   },

   getAllViews: () => get().views,
   getViewById: (id) => get().views.find((v) => v.id === id),
   getViewsByTeam: (teamId) => get().views.filter((v) => v.teamId === teamId),
   issueViews: () => get().views.filter((v) => v.type === 'issue'),
   projectViews: () => get().views.filter((v) => v.type === 'project'),

   createView: async (input) => {
      try {
         const view = await apiCreate(input);
         set({ views: [...get().views, view] });
         return view;
      } catch (err) {
         toast.error('Failed to create view');
         console.error(err);
         return null;
      }
   },

   updateView: (id, patch) => {
      const snapshot = get().views.find((v) => v.id === id);
      if (!snapshot) return;
      set({ views: get().views.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
      apiUpdate(id, viewPatchToBody(patch))
         .then((saved) => set({ views: get().views.map((v) => (v.id === id ? saved : v)) }))
         .catch((err) => {
            set({ views: get().views.map((v) => (v.id === id ? snapshot : v)) });
            toast.error('Failed to save changes');
            console.error(err);
         });
   },

   deleteView: (id) => {
      const snapshot = get().views;
      set({ views: snapshot.filter((v) => v.id !== id) });
      apiDelete(id).catch((err) => {
         set({ views: snapshot });
         toast.error('Failed to delete view');
         console.error(err);
      });
   },
}));
