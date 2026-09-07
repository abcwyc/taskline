'use client';

import { useEffect, useState } from 'react';
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

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
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

   useEffect(() => {
      let active = true;
      const needsCycles = pathname.includes('/cycle');
      const needsViews = pathname.includes('/view');
      const needsInitiatives = pathname.includes('initiative');
      setReady(false);
      setError(null);

      async function hydrateWorkspace() {
         try {
            await Promise.all([hydrateMe(), hydrateMembers(), hydrateLabels()]);
            await hydrateProjects();
            await Promise.all([hydrateTeams(), hydrateIssues()]);
            if (needsCycles) await hydrateCycles();
            if (needsViews) await hydrateViews();
            if (needsInitiatives) await hydrateInitiatives();
            await hydrateNotifications();
            if (active) setReady(true);
         } catch {
            if (active) setError('Workspace data could not be loaded.');
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
