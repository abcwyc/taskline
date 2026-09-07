import { useEffect } from 'react';
import { create } from 'zustand';
import { toast } from 'sonner';

import type {
   ProjectDetail,
   ProjectUpdate,
   ProjectUpdateHealth,
} from '@/mock-data/project-details';
import type { User } from '@/mock-data/users';
import { useMeStore } from '@/store/me-store';
import { useMembersStore } from '@/store/members-store';
import {
   fetchProjectDetail,
   postProjectUpdate as apiPostUpdate,
   setMilestoneCompleted as apiSetMilestone,
} from '@/lib/api/project-details';

/**
 * Per-project detail cache (Overview / Activity tabs). Lazy: `ensureDetail`
 * fetches on first view and exposes an empty persisted-data shape while loading.
 */
function emptyProjectDetail(projectId: string): ProjectDetail {
   return {
      projectId,
      summary: '',
      description: [],
      resources: [],
      milestones: [],
      updates: [],
      activity: [],
   };
}
interface ProjectDetailsState {
   detailsById: Record<string, ProjectDetail>;
   loading: Record<string, boolean>;

   ensureDetail: (projectId: string) => void;
   getDetail: (projectId: string) => ProjectDetail;

   postUpdate: (projectId: string, health: ProjectUpdateHealth, text: string) => void;
   toggleMilestone: (projectId: string, milestoneId: string, completed: boolean) => void;
}

export const useProjectDetailsStore = create<ProjectDetailsState>((set, get) => ({
   detailsById: {},
   loading: {},

   ensureDetail: (projectId) => {
      if (get().detailsById[projectId] || get().loading[projectId]) return;
      set((s) => ({ loading: { ...s.loading, [projectId]: true } }));
      fetchProjectDetail(projectId)
         .then((detail) => {
            set((s) => ({
               detailsById: { ...s.detailsById, [projectId]: detail },
               loading: { ...s.loading, [projectId]: false },
            }));
         })
         .catch((err) => {
            set((s) => ({ loading: { ...s.loading, [projectId]: false } }));
            console.error(err);
         });
   },

   getDetail: (projectId) => get().detailsById[projectId] ?? emptyProjectDetail(projectId),

   postUpdate: (projectId, health, text) => {
      const current = get().getDetail(projectId);
      const me = useMeStore.getState().me;
      const author =
         (me && useMembersStore.getState().getMemberById(me.id)) ??
         ({
            id: me?.id ?? 'current-user',
            name: me?.name ?? 'Current user',
            avatarUrl: me?.avatarUrl ?? '',
            email: me?.email ?? '',
            status: 'offline',
            role: (me?.role ?? 'Member') as User['role'],
            joinedDate: '',
            teamIds: [],
            timezone: me?.timezone ?? 'UTC',
         } satisfies User);
      const optimistic: ProjectUpdate = {
         id: `pending-${Date.now()}`,
         author,
         date: new Date().toISOString().slice(0, 10),
         health,
         blocks: text
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => ({ type: 'paragraph', text: p })),
      };
      const withOptimistic: ProjectDetail = {
         ...current,
         updates: [optimistic, ...current.updates],
      };
      set((s) => ({ detailsById: { ...s.detailsById, [projectId]: withOptimistic } }));

      apiPostUpdate(projectId, health, text)
         .then((saved) => {
            set((s) => {
               const d = s.detailsById[projectId] ?? withOptimistic;
               return {
                  detailsById: {
                     ...s.detailsById,
                     [projectId]: {
                        ...d,
                        updates: d.updates.map((u) => (u.id === optimistic.id ? saved : u)),
                     },
                  },
               };
            });
         })
         .catch((err) => {
            set((s) => {
               const d = s.detailsById[projectId] ?? withOptimistic;
               return {
                  detailsById: {
                     ...s.detailsById,
                     [projectId]: {
                        ...d,
                        updates: d.updates.filter((u) => u.id !== optimistic.id),
                     },
                  },
               };
            });
            toast.error('Failed to post update');
            console.error(err);
         });
   },

   toggleMilestone: (projectId, milestoneId, completed) => {
      const current = get().getDetail(projectId);
      const next: ProjectDetail = {
         ...current,
         milestones: current.milestones.map((m) =>
            m.id === milestoneId ? { ...m, completed } : m
         ),
      };
      set((s) => ({ detailsById: { ...s.detailsById, [projectId]: next } }));

      apiSetMilestone(projectId, milestoneId, completed).catch((err) => {
         set((s) => ({ detailsById: { ...s.detailsById, [projectId]: current } }));
         toast.error('Failed to update milestone');
         console.error(err);
      });
   },
}));

/** Convenience hook: ensures the fetch is kicked off and returns the detail. */
export function useProjectDetail(projectId: string): ProjectDetail {
   const ensureDetail = useProjectDetailsStore((s) => s.ensureDetail);
   // subscribe to this project's slice so the component re-renders when it lands
   const detail = useProjectDetailsStore((s) => s.detailsById[projectId]);

   useEffect(() => {
      ensureDetail(projectId);
   }, [ensureDetail, projectId]);

   return detail ?? emptyProjectDetail(projectId);
}
