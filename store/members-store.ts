import type { User } from '@/mock-data/users';
import { create } from 'zustand';
import { toast } from 'sonner';
import { tt } from '@/lib/i18n';

import {
   deleteMember as apiDeleteMember,
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
   removeMember: (id: string) => void;
}

export const useMembersStore = create<MembersState>((set, get) => ({
   members: [],
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
         toast.error(tt('Failed to load members'));
         throw err;
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
            toast.error(tt('Failed to save changes'));
            console.error(err);
         });
   },

   removeMember: (id) => {
      const snapshot = get().members;
      set({ members: snapshot.filter((member) => member.id !== id) });
      apiDeleteMember(id).catch((err) => {
         set({ members: snapshot });
         toast.error(tt('Failed to remove member'));
         console.error(err);
      });
   },
}));
