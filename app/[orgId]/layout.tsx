import { redirect } from 'next/navigation';

import { AuthSessionProvider } from '@/components/providers/session-provider';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';
import { LanguageProvider } from '@/components/providers/language-provider';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Workspace layout — everything under `/[orgId]` requires an authenticated user
 * who is a member of that workspace. The client data providers (which fetch
 * `/api/*`) live here, not in the root layout, so the public /sign-in page never
 * mounts them.
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
            <LanguageProvider>{children}</LanguageProvider>
         </WorkspaceProvider>
      </AuthSessionProvider>
   );
}
