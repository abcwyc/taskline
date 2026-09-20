'use client';

import { Switch } from '@/components/ui/switch';
import type { Preferences } from '@/lib/api/preferences';
import { useMeStore } from '@/store/me-store';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

/** Bind a boolean notification preference to a <Switch>; persists on change. */
function PrefSwitch({ name }: { name: keyof Preferences }) {
   const value = useMeStore((s) => s.preferences[name]) as boolean;
   const setPreference = useMeStore((s) => s.setPreference);
   return <Switch checked={value} onCheckedChange={(v) => setPreference(name, v as never)} />;
}

/** Personal notification settings, persisted as user preferences via /api/me. */
export default function AccountNotifications() {
   const { t } = useLanguage();
   return (
      <SettingsShell
         title={t('Notifications')}
         description={t('Choose which activity creates notifications in your inbox')}
      >
         <SettingsSection
            title={t('In-app notifications')}
            description={t('Events that create notifications in your workspace inbox')}
         >
            <SettingsCard>
               <SettingsRow
                  title={t('Comments')}
                  description={t('Someone comments on an issue you follow or are subscribed to')}
                  trailing={<PrefSwitch name="notifyComments" />}
               />
               <SettingsRow
                  title={t('Mentions')}
                  description={t('Someone mentions you with @your-username')}
                  trailing={<PrefSwitch name="notifyMentions" />}
               />
               <SettingsRow
                  title={t('Assignments')}
                  description={t('An issue is assigned to or unassigned from you')}
                  trailing={<PrefSwitch name="notifyAssignments" />}
               />
               <SettingsRow
                  title={t('Status changes')}
                  description={t('An issue you follow moves to another status')}
                  trailing={<PrefSwitch name="notifyStatusChanges" />}
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection title={t('Email')}>
            <SettingsCard>
               <SettingsRow
                  title={t('Email notifications')}
                  description={t('Requires SMTP to be configured by your operator')}
                  trailing={<PrefSwitch name="notifyEmail" />}
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
