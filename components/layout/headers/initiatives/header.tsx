'use client';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

export default function Header() {
   const { t } = useLanguage();
   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="text-sm font-medium">{t('Initiatives')}</span>
         </div>
         <Button size="xs" variant="ghost">
            <Plus className="size-4" />
         </Button>
      </div>
   );
}
