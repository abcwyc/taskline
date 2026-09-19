import CustomerRequestsSettings from '@/components/common/settings/customer-requests-settings';
import Header from '@/components/layout/headers/settings/header';
import MainLayout from '@/components/layout/main-layout';

export default function CustomerRequestsSettingsPage() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <CustomerRequestsSettings />
      </MainLayout>
   );
}
