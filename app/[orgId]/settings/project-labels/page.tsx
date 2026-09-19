import MainLayout from '@/components/layout/main-layout';
import ProjectLabelsSettings from '@/components/common/settings/project-labels-settings';
import Header from '@/components/layout/headers/settings/header';

export default function ProjectLabelsSettingsPage() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <ProjectLabelsSettings />
      </MainLayout>
   );
}
