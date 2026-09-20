'use client';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useTeamsStore } from '@/store/teams-store';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

export default function HeaderNav() {
   const { t } = useLanguage();
   const teams = useTeamsStore((s) => s.teams);
   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-2">
            <SidebarTrigger className="" />
            <div className="flex items-center gap-1">
               <span className="text-sm font-medium">{t('Teams')}</span>
               <span className="text-xs bg-accent rounded-md px-1.5 py-1">{teams.length}</span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <Button className="relative" size="xs" variant="secondary">
               <Plus className="size-4" />
               {t('Add team')}
            </Button>
         </div>
      </div>
   );
}
