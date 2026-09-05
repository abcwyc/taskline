import { LabelInterface, labels as mockLabels } from '@/mock-data/labels';
import { create } from 'zustand';
import { toast } from 'sonner';

import {
   createLabel as apiCreateLabel,
   deleteLabel as apiDeleteLabel,
   fetchLabels as apiFetchLabels,
   labelPatchToBody,
   updateLabel as apiUpdateLabel,
} from '@/lib/api/labels';
import type { LabelCreateBody } from '@/lib/api/types';

interface LabelsState {
   labels: LabelInterface[];
   hydrated: boolean;
   hydrate: () => Promise<void>;

   getAllLabels: () => LabelInterface[];
   getLabelById: (id: string) => LabelInterface | undefined;

   createLabel: (input: LabelCreateBody) => Promise<LabelInterface | null>;
   updateLabel: (id: string, patch: Partial<LabelInterface>) => void;
   deleteLabel: (id: string) => void;
}

export const useLabelsStore = create<LabelsState>((set, get) => ({
   labels: mockLabels,
   hydrated: false,

   hydrate: async () => {
      if (get().hydrated) return;
      try {
         set({ labels: await apiFetchLabels(), hydrated: true });
      } catch (err) {
         console.error(err);
      }
   },

   getAllLabels: () => get().labels,
   getLabelById: (id) => get().labels.find((l) => l.id === id),

   createLabel: async (input) => {
      try {
         const label = await apiCreateLabel(input);
         set({ labels: [...get().labels, label] });
         return label;
      } catch (err) {
         toast.error('Failed to create label');
         console.error(err);
         return null;
      }
   },

   updateLabel: (id, patch) => {
      const snapshot = get().labels.find((l) => l.id === id);
      if (!snapshot) return;
      set({ labels: get().labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
      apiUpdateLabel(id, labelPatchToBody(patch))
         .then((saved) => set({ labels: get().labels.map((l) => (l.id === id ? saved : l)) }))
         .catch((err) => {
            set({ labels: get().labels.map((l) => (l.id === id ? snapshot : l)) });
            toast.error('Failed to save changes');
            console.error(err);
         });
   },

   deleteLabel: (id) => {
      const snapshot = get().labels;
      set({ labels: snapshot.filter((l) => l.id !== id) });
      apiDeleteLabel(id).catch((err) => {
         set({ labels: snapshot });
         toast.error('Failed to delete label');
         console.error(err);
      });
   },
}));
