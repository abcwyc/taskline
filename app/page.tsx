import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/** Landing route: send the signed-in user into their workspace. */
export default async function Home() {
   const session = await auth();
   if (!session?.user?.id) redirect('/sign-in');

   const membership = await db.membership.findFirst({
      where: { userId: session.user.id },
      orderBy: { joinedAt: 'asc' },
      include: { org: { include: { teams: { orderBy: { key: 'asc' }, take: 1 } } } },
   });
   if (!membership) redirect('/sign-in');

   const team = membership.org.teams[0];
   redirect(`/${membership.org.slug}/${team ? `team/${team.key}/all` : 'projects'}`);
}
