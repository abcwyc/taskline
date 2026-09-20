'use client';

import { Link2Off } from 'lucide-react';
import { SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

/** Personal "Connected accounts" settings. Taskline authenticates with
 *  workspace credentials only — there is nothing to connect in this build. */
export default function AccountConnections() {
   const { t } = useLanguage();
   return (
      <SettingsShell
         title={t('Connected accounts')}
         description={t(
            'Connect your user accounts to sync attribution of your actions between apps'
         )}
      >
         <div className="rounded-lg border bg-container px-6 py-12 flex flex-col items-center justify-center gap-3 text-center">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
               <Link2Off className="size-5" />
            </span>
            <p className="text-sm font-medium">{t('No connected accounts')}</p>
            <p className="text-sm text-muted-foreground max-w-sm">
               {t(
                  "Taskline authenticates with your workspace credentials (email and password). Linking external accounts isn't part of this build."
               )}
            </p>
         </div>
      </SettingsShell>
   );
}
