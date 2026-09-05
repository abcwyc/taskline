'use client';

import { useEffect } from 'react';

import { useIssuesStore } from '@/store/issues-store';
import { useNotificationsStore } from '@/store/notifications-store';

/**
 * Kicks off the issues fetch that fills the Zustand store, then the
 * notifications fetch (which merges each notification with its live issue).
 *
 * The store itself stays the single source of truth / cache for the whole app
 * (no React Query) — this component only triggers `hydrate()` after mount so the
 * page shells can still render on the server.
 */
export function IssuesProvider({ children }: { children: React.ReactNode }) {
   const hydrate = useIssuesStore((s) => s.hydrate);
   const hydrateNotifications = useNotificationsStore((s) => s.hydrate);

   useEffect(() => {
      void hydrate().then(() => hydrateNotifications());
   }, [hydrate, hydrateNotifications]);

   return <>{children}</>;
}
