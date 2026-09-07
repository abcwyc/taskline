import type { Initiative } from '@/mock-data/initiatives';
import { Project } from '@/mock-data/projects';
import { create } from 'zustand';
import { toast } from 'sonner';

import {
   createInitiative as apiCreate,
   deleteInitiative as apiDelete,
   fetchInitiatives as apiFetch,
   initiativePatchToBody,
   updateInitiative as apiUpdate,
} from '@/lib/api/initiatives';
import type { InitiativeCreateBody } from '@/lib/api/types';
import { useProjectsStore } from '@/store/projects-store';

interface InitiativesState {
   initiatives: Initiative[];
   hydrated: boolean;
   isLoading: boolean;
   error: string | null;
   hydrate: () => Promise<void>;

   getAllInitiatives: () => Initiative[];
   getInitiativeById: (id: string) => Initiative | undefined;
   getInitiativeProjects: (initiative: Initiative) => Project[];
   countCompletedProjects: (initiative: Initiative) => number;
   getTeamInitiatives: (teamId: string) => Initiative[];

   createInitiative: (input: InitiativeCreateBody) => Promise<Initiative | null>;
   updateInitiative: (id: string, patch: Partial<Initiative>) => void;
   deleteInitiative: (id: string) => void;
}

/** Standalone helpers (read the live projects cache) — drop-in for the old
 *  mock-data functions of the same name. */
export const getInitiativeProjects = (initiative: Initiative): Project[] => {
   const all = useProjectsStore.getState().projects;
   return initiative.projectIds
      .map((id) => all.find((p) => p.id === id))
      .filter((p): p is Project => Boolean(p));
};
export const countCompletedProjects = (initiative: Initiative): number =>
   getInitiativeProjects(initiative).filter(
      (p) => p.status.category === 'completed' || p.percentComplete >= 100
   ).length;
const projectsOf = getInitiativeProjects;

export const useInitiativesStore = create<InitiativesState>((set, get) => ({
   initiatives: [],
   hydrated: false,
   isLoading: false,
   error: null,

   hydrate: async () => {
      if (get().hydrated || get().isLoading) return;
      set({ isLoading: true, error: null });
      try {
         set({ initiatives: await apiFetch(), hydrated: true, isLoading: false });
      } catch (err) {
         set({ isLoading: false, error: (err as Error).message });
         toast.error('Failed to load initiatives');
         throw err;
      }
   },

   getAllInitiatives: () => get().initiatives,
   getInitiativeById: (id) => get().initiatives.find((i) => i.id === id),
   getInitiativeProjects: projectsOf,
   countCompletedProjects: (initiative) =>
      projectsOf(initiative).filter(
         (p) => p.status.category === 'completed' || p.percentComplete >= 100
      ).length,
   getTeamInitiatives: (teamId) =>
      get().initiatives.filter(
         (i) => i.leadTeamId === teamId || projectsOf(i).some((p) => p.teamId === teamId)
      ),

   createInitiative: async (input) => {
      try {
         const initiative = await apiCreate(input);
         set({ initiatives: [...get().initiatives, initiative] });
         return initiative;
      } catch (err) {
         toast.error('Failed to create initiative');
         console.error(err);
         return null;
      }
   },

   updateInitiative: (id, patch) => {
      const snapshot = get().initiatives.find((i) => i.id === id);
      if (!snapshot) return;
      set({ initiatives: get().initiatives.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
      apiUpdate(id, initiativePatchToBody(patch))
         .then((saved) =>
            set({ initiatives: get().initiatives.map((i) => (i.id === id ? saved : i)) })
         )
         .catch((err) => {
            set({ initiatives: get().initiatives.map((i) => (i.id === id ? snapshot : i)) });
            toast.error('Failed to save changes');
            console.error(err);
         });
   },

   deleteInitiative: (id) => {
      const snapshot = get().initiatives;
      set({ initiatives: snapshot.filter((i) => i.id !== id) });
      apiDelete(id).catch((err) => {
         set({ initiatives: snapshot });
         toast.error('Failed to delete initiative');
         console.error(err);
      });
   },
}));
