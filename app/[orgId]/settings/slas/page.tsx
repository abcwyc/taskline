import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/headers/settings/header';
import SlasSettings from '@/components/common/settings/slas-settings';

export default function Page() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <SlasSettings />
      </MainLayout>
   );
}
