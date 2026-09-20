'use client';

import { Switch } from '@/components/ui/switch';
import { useMeStore } from '@/store/me-store';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

/** Personal "Code & reviews" settings. */
export default function AccountCodeReviews() {
   const notifyReviews = useMeStore((s) => s.preferences.reviewNotifications);
   const setPreference = useMeStore((s) => s.setPreference);
   const { t } = useLanguage();

   return (
      <SettingsShell
         title={t('Code & reviews')}
         description={t('Review code and track review requests inside your workspace')}
      >
         <SettingsSection title={t('Notifications')}>
            <SettingsCard>
               <SettingsRow
                  title={t('Review requests')}
                  description={t('Notify me about review requests')}
                  trailing={
                     <Switch
                        checked={notifyReviews}
                        onCheckedChange={(v) => setPreference('reviewNotifications', v)}
                     />
                  }
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection title={t('Reviews')}>
            <p className="text-sm text-muted-foreground">
               {t('Reviews live under /{org}/reviews and are created from the Reviews page.')}
            </p>
         </SettingsSection>
      </SettingsShell>
   );
}
