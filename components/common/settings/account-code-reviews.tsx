'use client';

import { Switch } from '@/components/ui/switch';
import { useMeStore } from '@/store/me-store';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';

/** Personal "Code & reviews" settings. */
export default function AccountCodeReviews() {
   const notifyReviews = useMeStore((s) => s.preferences.reviewNotifications);
   const setPreference = useMeStore((s) => s.setPreference);

   return (
      <SettingsShell
         title="Code & reviews"
         description="Review code and track review requests inside your workspace"
      >
         <SettingsSection title="Notifications">
            <SettingsCard>
               <SettingsRow
                  title="Review requests"
                  description="Notify me about review requests"
                  trailing={
                     <Switch
                        checked={notifyReviews}
                        onCheckedChange={(v) => setPreference('reviewNotifications', v)}
                     />
                  }
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection title="Reviews">
            <p className="text-sm text-muted-foreground">
               Reviews live under /{'{org}'}/reviews and are created from the Reviews page.
            </p>
         </SettingsSection>
      </SettingsShell>
   );
}
