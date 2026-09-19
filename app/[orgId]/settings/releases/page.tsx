import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/headers/settings/header';
import ReleasesSettings from '@/components/common/settings/releases-settings';

export default function Page() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <ReleasesSettings />
      </MainLayout>
   );
}
