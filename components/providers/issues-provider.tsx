'use client';

import { useEffect } from 'react';

import { useIssuesStore } from '@/store/issues-store';

/**
 * Kicks off the one-time issues fetch that fills the Zustand store.
 *
 * The store itself stays the single source of truth / cache for the whole app
 * (no React Query) — this component only triggers `hydrate()` after mount so the
 * page shells can still render on the server. Mount it once, high in the tree.
 *
 * When more slices exist, either add their `hydrate()` calls here or give each
 * its own tiny provider.
 */
export function IssuesProvider({ children }: { children: React.ReactNode }) {
   const hydrate = useIssuesStore((s) => s.hydrate);

   useEffect(() => {
      void hydrate();
   }, [hydrate]);

   return <>{children}</>;
}
