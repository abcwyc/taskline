import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/headers/settings/header';
import EmojisSettings from '@/components/common/settings/emojis-settings';

export default function Page() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <EmojisSettings />
      </MainLayout>
   );
}
