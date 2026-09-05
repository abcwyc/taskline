import MemberProfile from '@/components/common/members/member-profile';
import Header from '@/components/layout/headers/profile/header';
import MainLayout from '@/components/layout/main-layout';
import { getRequestContext } from '@/lib/api/context';
import { dtoToMember } from '@/lib/api/members';
import { getMember } from '@/lib/api/members.server';
import { notFound } from 'next/navigation';

interface MemberProfilePageProps {
   params: Promise<{ memberId: string }>;
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
   const { memberId } = await params;
   const { orgId } = await getRequestContext();
   const dto = await getMember(orgId, memberId);

   if (!dto) {
      notFound();
   }

   const member = dtoToMember(dto);

   return (
      <MainLayout header={<Header member={member} />}>
         <MemberProfile member={member} />
      </MainLayout>
   );
}
