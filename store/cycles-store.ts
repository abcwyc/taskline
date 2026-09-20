import type { Cycle } from '@/mock-data/cycles';
import { create } from 'zustand';
import { toast } from 'sonner';

import {
   createCycle as apiCreateCycle,
   cyclePatchToBody,
   deleteCycle as apiDeleteCycle,
   fetchCycles as apiFetchCycles,
   updateCycle as apiUpdateCycle,
} from '@/lib/api/cycles';
import type { CycleCreateBody } from '@/lib/api/types';
import { tt } from '@/lib/i18n';

interface CyclesState {
   cycles: Cycle[];
   hydrated: boolean;
   isLoading: boolean;
   error: string | null;
   hydrate: () => Promise<void>;

   getAllCycles: () => Cycle[];
   getCycleById: (id: string) => Cycle | undefined;
   getCyclesByTeam: (teamId: string) => Cycle[];
   getCurrentCycle: (teamId?: string) => Cycle;
   getUpcomingCycle: (teamId?: string) => Cycle;

   createCycle: (input: CycleCreateBody) => Promise<Cycle | null>;
   updateCycle: (id: string, patch: Partial<Cycle>) => void;
   deleteCycle: (id: string) => void;
}

const pick = (list: Cycle[], status: Cycle['status'], teamId?: string) => {
   const scoped = teamId ? list.filter((c) => c.teamId === teamId) : list;
   return scoped.find((c) => c.status === status) ?? scoped[0] ?? list[0];
};

export const useCyclesStore = create<CyclesState>((set, get) => ({
   cycles: [],
   hydrated: false,
   isLoading: false,
   error: null,

   hydrate: async () => {
      if (get().hydrated || get().isLoading) return;
      set({ isLoading: true, error: null });
      try {
         set({ cycles: await apiFetchCycles(), hydrated: true, isLoading: false });
      } catch (err) {
         set({ isLoading: false, error: (err as Error).message });
         toast.error(tt('Failed to load cycles'));
         throw err;
      }
   },

   getAllCycles: () => get().cycles,
   getCycleById: (id) => get().cycles.find((c) => c.id === id),
   getCyclesByTeam: (teamId) => get().cycles.filter((c) => c.teamId === teamId),
   getCurrentCycle: (teamId) => pick(get().cycles, 'current', teamId),
   getUpcomingCycle: (teamId) => pick(get().cycles, 'upcoming', teamId),

   createCycle: async (input) => {
      try {
         const cycle = await apiCreateCycle(input);
         set({ cycles: [cycle, ...get().cycles] });
         return cycle;
      } catch (err) {
         toast.error(tt('Failed to create cycle'));
         console.error(err);
         return null;
      }
   },

   updateCycle: (id, patch) => {
      const snapshot = get().cycles.find((c) => c.id === id);
      if (!snapshot) return;
      set({ cycles: get().cycles.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
      apiUpdateCycle(id, cyclePatchToBody(patch))
         .then((saved) => set({ cycles: get().cycles.map((c) => (c.id === id ? saved : c)) }))
         .catch((err) => {
            set({ cycles: get().cycles.map((c) => (c.id === id ? snapshot : c)) });
            toast.error(tt('Failed to save changes'));
            console.error(err);
         });
   },

   deleteCycle: (id) => {
      const snapshot = get().cycles;
      set({ cycles: snapshot.filter((c) => c.id !== id) });
      apiDeleteCycle(id).catch((err) => {
         set({ cycles: snapshot });
         toast.error(tt('Failed to delete cycle'));
         console.error(err);
      });
   },
}));
