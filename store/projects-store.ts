import type { Project } from '@/mock-data/projects';
import { create } from 'zustand';
import { toast } from 'sonner';
import { createMutationGuard } from '@/lib/client-mutation';
import { tt } from '@/lib/i18n';

import {
   createProject as apiCreateProject,
   deleteProject as apiDeleteProject,
   fetchProjects as apiFetchProjects,
   projectPatchToBody,
   projectToCreateBody,
   updateProject as apiUpdateProject,
} from '@/lib/api/projects';

/**
 * DB-backed projects cache.
 *
 * There was no projects store before — the tables read `mock-data/projects`
 * directly. Components that need the live list now read `useProjectsStore`;
 * `getProjectById` / `getProjectsByTeam` mirror the mock-data helpers so call
 * sites swap 1:1. Writes are optimistic + rolled back on failure (same shape as
 * `issues-store`).
 */
interface ProjectsState {
   projects: Project[];
   hydrated: boolean;
   isLoading: boolean;
   error: string | null;
   hydrate: () => Promise<void>;

   getAllProjects: () => Project[];
   getProjectById: (id: string) => Project | undefined;
   getProjectsByTeam: (teamId: string) => Project[];

   addProject: (project: Project) => void;
   /** Create via the API and return the saved project (for "create then navigate"). */
   createProject: (project: Project) => Promise<Project | null>;
   updateProject: (id: string, patch: Partial<Project>) => void;
   deleteProject: (id: string) => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => {
   const mutations = createMutationGuard();
   return {
      projects: [],
      hydrated: false,
      isLoading: false,
      error: null,

      hydrate: async () => {
         if (get().hydrated || get().isLoading) return;
         set({ isLoading: true, error: null });
         try {
            const projects = await apiFetchProjects();
            set({ projects, hydrated: true, isLoading: false });
         } catch (err) {
            set({ isLoading: false, error: (err as Error).message });
            toast.error(tt('Failed to load projects'));
            throw err;
         }
      },

      getAllProjects: () => get().projects,
      getProjectById: (id) => get().projects.find((p) => p.id === id),
      getProjectsByTeam: (teamId) => get().projects.filter((p) => p.teamId === teamId),

      addProject: (project) => {
         set({ projects: [...get().projects, project] });
         apiCreateProject(projectToCreateBody(project))
            .then((saved) => {
               set({ projects: get().projects.map((p) => (p.id === project.id ? saved : p)) });
            })
            .catch((err) => {
               set({ projects: get().projects.filter((p) => p.id !== project.id) });
               toast.error(tt('Failed to create project'));
               console.error(err);
            });
      },

      createProject: async (project) => {
         try {
            const saved = await apiCreateProject(projectToCreateBody(project));
            set({ projects: [...get().projects, saved] });
            return saved;
         } catch (err) {
            toast.error(tt('Failed to create project'));
            console.error(err);
            return null;
         }
      },

      updateProject: (id, patch) => {
         const snapshot = get().projects.find((p) => p.id === id);
         if (!snapshot) return;
         set({ projects: get().projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

         const version = mutations.begin(id);
         apiUpdateProject(id, projectPatchToBody(patch))
            .then((saved) => {
               if (!mutations.isCurrent(id, version)) return;
               set({ projects: get().projects.map((p) => (p.id === id ? saved : p)) });
            })
            .catch((err) => {
               if (!mutations.isCurrent(id, version)) return;
               set({ projects: get().projects.map((p) => (p.id === id ? snapshot : p)) });
               toast.error(tt('Failed to save changes'));
               console.error(err);
            });
      },

      deleteProject: (id) => {
         const snapshot = get().projects;
         set({ projects: snapshot.filter((project) => project.id !== id) });
         const version = mutations.begin(id);
         apiDeleteProject(id).catch((err) => {
            if (!mutations.isCurrent(id, version)) return;
            set({ projects: snapshot });
            toast.error(tt('Failed to delete project'));
            console.error(err);
         });
      },
   };
});
