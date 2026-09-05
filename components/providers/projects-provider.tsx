'use client';

import { useEffect } from 'react';

import { useInitiativesStore } from '@/store/initiatives-store';
import { useProjectsStore } from '@/store/projects-store';

/** Triggers the projects fetch, then initiatives (which reference projects). */
export function ProjectsProvider({ children }: { children: React.ReactNode }) {
   const hydrate = useProjectsStore((s) => s.hydrate);
   const hydrateInitiatives = useInitiativesStore((s) => s.hydrate);

   useEffect(() => {
      void hydrate().then(() => hydrateInitiatives());
   }, [hydrate, hydrateInitiatives]);

   return <>{children}</>;
}
