import AsksSettings from '@/components/common/settings/asks-settings';
import Header from '@/components/layout/headers/settings/header';
import MainLayout from '@/components/layout/main-layout';

export default function AsksSettingsPage() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <AsksSettings />
      </MainLayout>
   );
}
