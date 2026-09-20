import { redirect } from 'next/navigation';

import { AuthSessionProvider } from '@/components/providers/session-provider';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';
import { LanguageProvider } from '@/components/providers/language-provider';
import { AppSidebar } from '@/components/layout/sidebar/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CreateIssueModalProvider } from '@/components/common/issues/create-issue-modal-provider';
import { CommandPalette } from '@/components/layout/command-palette';
import { GlobalShortcuts } from '@/components/layout/shortcuts/global-shortcuts';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Workspace layout — everything under `/[orgId]` requires an authenticated user
 * who is a member of that workspace. The client data providers (which fetch
 * `/api/*`) live here, not in the root layout, so the public /sign-in page never
 * mounts them.
 *
 * The persistent app shell (sidebar, command palette, create-issue modal) also
 * lives here so that navigating between workspace pages re-renders only the
 * page content, never the chrome around it.
 */
export default async function OrgLayout({
   children,
   params,
}: {
   children: React.ReactNode;
   params: Promise<{ orgId: string }>;
}) {
   const session = await auth();
   if (!session?.user?.id) redirect('/sign-in');

   const { orgId } = await params;
   const member = await db.membership.findFirst({
      where: { userId: session.user.id, org: { slug: orgId } },
      select: { id: true },
   });
   if (!member) redirect('/');

   const configuredRefresh = Number(process.env.WORKSPACE_REFRESH_INTERVAL_MS ?? 30_000);
   const refreshIntervalMs = Number.isFinite(configuredRefresh)
      ? Math.max(0, configuredRefresh)
      : 30_000;

   return (
      <AuthSessionProvider session={session}>
         <WorkspaceProvider refreshIntervalMs={refreshIntervalMs}>
            <LanguageProvider>
               <SidebarProvider>
                  <CreateIssueModalProvider />
                  <CommandPalette />
                  <GlobalShortcuts />
                  <AppSidebar />
                  <div className="h-svh overflow-hidden lg:p-2 w-full">{children}</div>
               </SidebarProvider>
            </LanguageProvider>
         </WorkspaceProvider>
      </AuthSessionProvider>
   );
}
