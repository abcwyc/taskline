import InitiativesSettings from '@/components/common/settings/initiatives-settings';
import Header from '@/components/layout/headers/settings/header';
import MainLayout from '@/components/layout/main-layout';

export default function InitiativesSettingsPage() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <InitiativesSettings />
      </MainLayout>
   );
}
