'use client';

import { useEffect } from 'react';

import { useCyclesStore } from '@/store/cycles-store';
import { useDocumentsStore } from '@/store/documents-store';
import { useLabelsStore } from '@/store/labels-store';
import { useMembersStore } from '@/store/members-store';
import { useTeamsStore } from '@/store/teams-store';
import { useTriageStore } from '@/store/triage-store';
import { useViewsStore } from '@/store/views-store';

/**
 * Hydrates the workspace reference data (teams, members, labels, …) that the
 * whole app reads. One provider, mounted once in the `[orgId]` layout.
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
   const hydrateTeams = useTeamsStore((s) => s.hydrate);
   const hydrateMembers = useMembersStore((s) => s.hydrate);
   const hydrateLabels = useLabelsStore((s) => s.hydrate);
   const hydrateCycles = useCyclesStore((s) => s.hydrate);
   const hydrateViews = useViewsStore((s) => s.hydrate);
   const hydrateTriage = useTriageStore((s) => s.hydrate);
   const hydrateDocuments = useDocumentsStore((s) => s.hydrate);

   useEffect(() => {
      void hydrateMembers();
      void hydrateTeams();
      void hydrateLabels();
      void hydrateCycles();
      void hydrateViews();
      void hydrateTriage();
      void hydrateDocuments();
   }, [
      hydrateMembers,
      hydrateTeams,
      hydrateLabels,
      hydrateCycles,
      hydrateViews,
      hydrateTriage,
      hydrateDocuments,
   ]);

   return <>{children}</>;
}
