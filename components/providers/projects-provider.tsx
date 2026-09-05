'use client';

import { useEffect } from 'react';

import { useProjectsStore } from '@/store/projects-store';

/** Triggers the one-time projects fetch. Mirrors <IssuesProvider>. */
export function ProjectsProvider({ children }: { children: React.ReactNode }) {
   const hydrate = useProjectsStore((s) => s.hydrate);

   useEffect(() => {
      void hydrate();
   }, [hydrate]);

   return <>{children}</>;
}
