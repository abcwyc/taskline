import { Team, teams as mockTeams } from '@/mock-data/teams';
import { create } from 'zustand';
import { toast } from 'sonner';

import {
   createTeam as apiCreateTeam,
   deleteTeam as apiDeleteTeam,
   fetchTeams as apiFetchTeams,
   teamPatchToBody,
   updateTeam as apiUpdateTeam,
} from '@/lib/api/teams';
import type { TeamCreateBody } from '@/lib/api/types';

/**
 * Teams cache. `getTeamById` looks up by the team key ("CORE") — same as the
 * old `teams.find(t => t.id === teamId)` call sites and the `[teamId]` route.
 */
interface TeamsState {
   teams: Team[];
   hydrated: boolean;
   isLoading: boolean;
   error: string | null;
   hydrate: () => Promise<void>;

   getAllTeams: () => Team[];
   getTeamById: (id: string) => Team | undefined;
   getJoinedTeams: () => Team[];

   createTeam: (input: TeamCreateBody) => Promise<Team | null>;
   updateTeam: (id: string, patch: Partial<Team>) => void;
   deleteTeam: (id: string) => void;
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
   // Seeded with the static mock so `teams.find(...)` call sites and the
   // `[teamId]` headers render immediately; `hydrate()` swaps in DB data.
   teams: mockTeams,
   hydrated: false,
   isLoading: false,
   error: null,

   hydrate: async () => {
      if (get().hydrated || get().isLoading) return;
      set({ isLoading: true, error: null });
      try {
         const teams = await apiFetchTeams();
         set({ teams, hydrated: true, isLoading: false });
      } catch (err) {
         set({ isLoading: false, error: (err as Error).message });
         toast.error('Failed to load teams');
      }
   },

   getAllTeams: () => get().teams,
   getTeamById: (id) => get().teams.find((t) => t.id === id),
   getJoinedTeams: () => get().teams.filter((t) => t.joined),

   createTeam: async (input) => {
      try {
         const team = await apiCreateTeam(input);
         set({ teams: [...get().teams, team] });
         return team;
      } catch (err) {
         toast.error('Failed to create team');
         console.error(err);
         return null;
      }
   },

   updateTeam: (id, patch) => {
      const snapshot = get().teams.find((t) => t.id === id);
      if (!snapshot) return;
      set({ teams: get().teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

      apiUpdateTeam(id, teamPatchToBody(patch))
         .then((saved) => set({ teams: get().teams.map((t) => (t.id === id ? saved : t)) }))
         .catch((err) => {
            set({ teams: get().teams.map((t) => (t.id === id ? snapshot : t)) });
            toast.error('Failed to save changes');
            console.error(err);
         });
   },

   deleteTeam: (id) => {
      const snapshot = get().teams;
      set({ teams: snapshot.filter((t) => t.id !== id) });
      apiDeleteTeam(id).catch((err) => {
         set({ teams: snapshot });
         toast.error('Failed to delete team');
         console.error(err);
      });
   },
}));
