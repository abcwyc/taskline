import { create } from 'zustand';
import { toast } from 'sonner';

import { fetchMe, updateMe as apiUpdateMe } from '@/lib/api/me';
import { DEFAULT_PREFERENCES, Preferences } from '@/lib/api/preferences';
import type { MeDTO } from '@/lib/api/types';
import { tt } from '@/lib/i18n';
import { useMembersStore } from '@/store/members-store';

/**
 * The signed-in user's own profile + preferences. Hydrated once (in the
 * `[orgId]` layout via WorkspaceProvider). Writes are optimistic with rollback.
 */
interface MeState {
   me: MeDTO | null;
   hydrated: boolean;
   loading: boolean;
   error: string | null;
   preferences: Preferences;
   hydrate: () => Promise<void>;
   saveProfile: (patch: Partial<Pick<MeDTO, 'name' | 'jobTitle' | 'timezone'>>) => Promise<void>;
   setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>;
}

export const useMeStore = create<MeState>((set, get) => ({
   me: null,
   hydrated: false,
   loading: false,
   error: null,
   preferences: { ...DEFAULT_PREFERENCES },

   hydrate: async () => {
      if (get().hydrated || get().loading) return;
      set({ loading: true, error: null });
      try {
         const me = await fetchMe();
         set({ me, preferences: me.preferences, hydrated: true, loading: false });
      } catch (err) {
         set({ hydrated: false, loading: false, error: (err as Error).message });
         throw err;
      }
   },

   saveProfile: async (patch) => {
      const snapshot = get().me;
      if (snapshot) set({ me: { ...snapshot, ...patch } });
      try {
         const me = await apiUpdateMe(patch);
         set({ me, preferences: me.preferences });
         // keep the shared members cache (sidebar, avatars, pickers) in sync
         if (patch.name !== undefined) {
            useMembersStore.getState().updateMemberLocal(me.id, { name: me.name });
         }
      } catch (err) {
         if (snapshot) set({ me: snapshot });
         toast.error(tt('Failed to save profile'));
         console.error(err);
      }
   },

   setPreference: async (key, value) => {
      const snapshot = get().preferences;
      set({ preferences: { ...snapshot, [key]: value } });
      try {
         const me = await apiUpdateMe({ preferences: { [key]: value } });
         set({ me, preferences: me.preferences });
      } catch (err) {
         set({ preferences: snapshot });
         toast.error(tt('Failed to save preference'));
         console.error(err);
      }
   },
}));
