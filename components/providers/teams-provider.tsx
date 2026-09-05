'use client';

import { useEffect } from 'react';

import { useMembersStore } from '@/store/members-store';
import { useTeamsStore } from '@/store/teams-store';

/** Kicks off the one-time teams + members fetches. */
export function TeamsProvider({ children }: { children: React.ReactNode }) {
   const hydrateTeams = useTeamsStore((s) => s.hydrate);
   const hydrateMembers = useMembersStore((s) => s.hydrate);

   useEffect(() => {
      void hydrateMembers();
      void hydrateTeams();
   }, [hydrateMembers, hydrateTeams]);

   return <>{children}</>;
}
