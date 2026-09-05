import ProjectIssues from '@/components/common/projects/details/project-issues';
import Header from '@/components/layout/headers/project/header';
import MainLayout from '@/components/layout/main-layout';
import { getRequestContext } from '@/lib/api/context';
import { getProject } from '@/lib/api/projects.server';
import { notFound } from 'next/navigation';

interface ProjectPageProps {
   params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
   const { projectId } = await params;
   const { orgId } = await getRequestContext();
   const project = await getProject(orgId, projectId);

   if (!project) {
      notFound();
   }

   return (
      <MainLayout header={<Header projectId={projectId} />}>
         <ProjectIssues projectId={projectId} />
      </MainLayout>
   );
}
