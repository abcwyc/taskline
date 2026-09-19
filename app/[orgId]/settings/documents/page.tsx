import DocumentsSettings from '@/components/common/settings/documents-settings';
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/headers/settings/header';

export default function DocumentsSettingsPage() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <DocumentsSettings />
      </MainLayout>
   );
}
