'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { useCyclesStore } from '@/store/cycles-store';
import { useInitiativesStore } from '@/store/initiatives-store';
import { useIssuesStore } from '@/store/issues-store';
import { useLabelsStore } from '@/store/labels-store';
import { useMeStore } from '@/store/me-store';
import { useMembersStore } from '@/store/members-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useProjectsStore } from '@/store/projects-store';
import { useTeamsStore } from '@/store/teams-store';
import { useViewsStore } from '@/store/views-store';

export function WorkspaceProvider({
   children,
   refreshIntervalMs = 30_000,
}: {
   children: React.ReactNode;
   refreshIntervalMs?: number;
}) {
   const hydrateMe = useMeStore((state) => state.hydrate);
   const hydrateMembers = useMembersStore((state) => state.hydrate);
   const hydrateLabels = useLabelsStore((state) => state.hydrate);
   const hydrateProjects = useProjectsStore((state) => state.hydrate);
   const hydrateTeams = useTeamsStore((state) => state.hydrate);
   const hydrateCycles = useCyclesStore((state) => state.hydrate);
   const hydrateViews = useViewsStore((state) => state.hydrate);
   const hydrateIssues = useIssuesStore((state) => state.hydrate);
   const hydrateInitiatives = useInitiativesStore((state) => state.hydrate);
   const hydrateNotifications = useNotificationsStore((state) => state.hydrate);
   const pathname = usePathname();
   const [attempt, setAttempt] = useState(0);
   const [ready, setReady] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const readyRef = useRef(false);

   useEffect(() => {
      let active = true;
      const needsCycles = pathname.includes('/cycle');
      const needsViews = pathname.includes('/view');
      const needsInitiatives = pathname.includes('initiative');
      const firstLoad = !readyRef.current;
      if (firstLoad) setError(null);

      async function hydrateWorkspace() {
         try {
            if (firstLoad) {
               await Promise.all([hydrateMe(), hydrateMembers(), hydrateLabels()]);
               await hydrateProjects();
               await Promise.all([hydrateTeams(), hydrateIssues()]);
            }
            if (needsCycles) await hydrateCycles();
            if (needsViews) await hydrateViews();
            if (needsInitiatives) await hydrateInitiatives();
            if (firstLoad) await hydrateNotifications();
            if (active && firstLoad) {
               readyRef.current = true;
               setReady(true);
            }
         } catch {
            if (active && firstLoad) setError('Workspace data could not be loaded.');
         }
      }

      void hydrateWorkspace();
      return () => {
         active = false;
      };
   }, [
      attempt,
      pathname,
      hydrateMe,
      hydrateMembers,
      hydrateLabels,
      hydrateProjects,
      hydrateTeams,
      hydrateCycles,
      hydrateViews,
      hydrateIssues,
      hydrateInitiatives,
      hydrateNotifications,
   ]);

   useEffect(() => {
      const intervalMs = Number.isFinite(refreshIntervalMs)
         ? Math.max(0, refreshIntervalMs)
         : 30_000;

      const refresh = async () => {
         if (!readyRef.current || document.visibilityState !== 'visible') return;
         await hydrateIssues(true);
         // Notifications refer to issues, so refresh them after the issue cache.
         await hydrateNotifications(true);
      };
      const onVisible = () => {
         if (document.visibilityState === 'visible') void refresh();
      };

      window.addEventListener('focus', refresh);
      document.addEventListener('visibilitychange', onVisible);
      const timer = intervalMs > 0 ? window.setInterval(refresh, intervalMs) : undefined;
      return () => {
         window.removeEventListener('focus', refresh);
         document.removeEventListener('visibilitychange', onVisible);
         if (timer !== undefined) window.clearInterval(timer);
      };
   }, [hydrateIssues, hydrateNotifications, refreshIntervalMs]);

   if (error) {
      return (
         <main className="flex min-h-svh items-center justify-center bg-background p-6">
            <div className="max-w-sm rounded-lg border bg-container p-6 text-center">
               <h1 className="text-base font-semibold">Unable to load workspace</h1>
               <p className="mt-2 text-sm text-muted-foreground">{error}</p>
               <button
                  type="button"
                  className="mt-4 rounded-md bg-foreground px-3 py-2 text-sm text-background"
                  onClick={() => setAttempt((value) => value + 1)}
               >
                  Retry
               </button>
            </div>
         </main>
      );
   }

   if (!ready) {
      return (
         <main className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
            Loading workspace…
         </main>
      );
   }

   return <>{children}</>;
}
