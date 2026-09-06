import { User, users as mockUsers } from '@/mock-data/users';
import { create } from 'zustand';
import { toast } from 'sonner';

import {
   fetchMembers as apiFetchMembers,
   memberPatchToBody,
   updateMember as apiUpdateMember,
} from '@/lib/api/members';

/**
 * Workspace members cache. Read-heavy (pickers, avatars, profiles); the only
 * write today is role/timezone/name via the settings + member profile.
 */
interface MembersState {
   members: User[];
   hydrated: boolean;
   isLoading: boolean;
   error: string | null;
   hydrate: () => Promise<void>;

   getAllMembers: () => User[];
   getMemberById: (id: string) => User | undefined;
   getMembersByTeam: (teamId: string) => User[];

   updateMember: (id: string, patch: Partial<User>) => void;
   /** Patch the cache only (no API call) — e.g. after the user edits their own profile. */
   updateMemberLocal: (id: string, patch: Partial<User>) => void;
}

export const useMembersStore = create<MembersState>((set, get) => ({
   // Seeded with the static mock so pickers/avatars render before hydrate.
   members: mockUsers,
   hydrated: false,
   isLoading: false,
   error: null,

   hydrate: async () => {
      if (get().hydrated || get().isLoading) return;
      set({ isLoading: true, error: null });
      try {
         const members = await apiFetchMembers();
         set({ members, hydrated: true, isLoading: false });
      } catch (err) {
         set({ isLoading: false, error: (err as Error).message });
         toast.error('Failed to load members');
      }
   },

   getAllMembers: () => get().members,
   getMemberById: (id) => get().members.find((m) => m.id === id),
   getMembersByTeam: (teamId) => get().members.filter((m) => m.teamIds.includes(teamId)),

   updateMemberLocal: (id, patch) => {
      set({ members: get().members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
   },

   updateMember: (id, patch) => {
      const snapshot = get().members.find((m) => m.id === id);
      if (!snapshot) return;
      set({ members: get().members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

      apiUpdateMember(id, memberPatchToBody(patch))
         .then((saved) => {
            set({ members: get().members.map((m) => (m.id === id ? saved : m)) });
         })
         .catch((err) => {
            set({ members: get().members.map((m) => (m.id === id ? snapshot : m)) });
            toast.error('Failed to save changes');
            console.error(err);
         });
   },
}));
