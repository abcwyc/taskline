import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface OrgIdPageProps {
   params: Promise<{ orgId: string }>;
}

export default async function OrgIdPage({ params }: OrgIdPageProps) {
   const session = await auth();
   if (!session?.user?.id) redirect('/sign-in');

   const { orgId } = await params;
   const org = await db.organization.findFirst({
      where: { slug: orgId, members: { some: { userId: session.user.id } } },
      include: { teams: { orderBy: { key: 'asc' }, take: 1 } },
   });
   if (!org) redirect('/');

   const team = org.teams[0];
   redirect(`/${org.slug}/${team ? `team/${team.key}/all` : 'projects'}`);
}
