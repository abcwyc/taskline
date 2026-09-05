import { TriageItem } from '@/mock-data/triage';
import { create } from 'zustand';
import { toast } from 'sonner';

import { acceptTriageItem, fetchTriageItems, setTriageItemStatus } from '@/lib/api/triage';
import { useIssuesStore } from './issues-store';

/**
 * The team intake queue. Accept promotes the item into a real issue
 * (persisted, and mirrored into the issues store), Decline / Snooze mark it.
 */
interface TriageState {
   items: TriageItem[];
   selectedId: string | null;
   hydrated: boolean;
   hydrate: () => Promise<void>;

   select: (id: string | null) => void;
   itemsForTeam: (teamId: string) => TriageItem[];
   pendingCount: (teamId: string) => number;
   accept: (id: string) => void;
   decline: (id: string) => void;
   snooze: (id: string) => void;
}

const nextSelection = (items: TriageItem[], id: string): string | null => {
   const gone = items.find((item) => item.id === id);
   if (!gone) return null;
   const sibling = items.find((item) => item.id !== id && item.teamId === gone.teamId);
   return sibling?.id ?? null;
};

export const useTriageStore = create<TriageState>((set, get) => ({
   items: [],
   selectedId: null,
   hydrated: false,

   hydrate: async () => {
      if (get().hydrated) return;
      try {
         set({ items: await fetchTriageItems(), hydrated: true });
      } catch (err) {
         console.error(err);
      }
   },

   select: (id) => set({ selectedId: id }),
   itemsForTeam: (teamId) => get().items.filter((item) => item.teamId === teamId),
   pendingCount: (teamId) => get().items.filter((item) => item.teamId === teamId).length,

   accept: (id) => {
      const snapshot = get().items;
      set((state) => ({
         items: state.items.filter((entry) => entry.id !== id),
         selectedId: nextSelection(state.items, id),
      }));
      acceptTriageItem(id)
         .then((issue) => useIssuesStore.getState().receiveIssue(issue))
         .catch((err) => {
            set({ items: snapshot });
            toast.error('Failed to accept item');
            console.error(err);
         });
   },

   decline: (id) => {
      const snapshot = get().items;
      set((state) => ({
         items: state.items.filter((entry) => entry.id !== id),
         selectedId: nextSelection(state.items, id),
      }));
      setTriageItemStatus(id, 'declined').catch((err) => {
         set({ items: snapshot });
         toast.error('Failed to decline item');
         console.error(err);
      });
   },

   snooze: (id) => {
      const snapshot = get().items;
      set((state) => ({
         items: state.items.filter((entry) => entry.id !== id),
         selectedId: nextSelection(state.items, id),
      }));
      setTriageItemStatus(id, 'snoozed').catch((err) => {
         set({ items: snapshot });
         toast.error('Failed to snooze item');
         console.error(err);
      });
   },
}));
