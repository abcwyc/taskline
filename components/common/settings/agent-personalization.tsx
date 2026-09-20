'use client';

import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMeStore } from '@/store/me-store';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

/** Personal settings for the workspace agent. */
export default function AgentPersonalization() {
   const guidance = useMeStore((s) => s.preferences.agentGuidance);
   const setPreference = useMeStore((s) => s.setPreference);
   const [draft, setDraft] = useState(guidance);
   const { t } = useLanguage();

   useEffect(() => {
      setDraft(guidance);
   }, [guidance]);

   /** Persist on blur; the store is optimistic with rollback on failure. */
   const commit = async () => {
      const next = draft.trim();
      if (next === guidance) return;
      setDraft(next);
      await setPreference('agentGuidance', next);
      // setPreference resolves even after a rolled-back failure, so confirm
      // the persisted value actually took before claiming success.
      if (useMeStore.getState().preferences.agentGuidance === next) {
         toast.success(t('Guidance saved'));
      }
   };

   return (
      <SettingsShell
         title={t('Agent personalization')}
         description={t('Your personal settings for the workspace agent')}
      >
         <SettingsSection
            title={t('Guidance')}
            description={t(
               'Provide personal instructions and context for the agent when responding to conversations'
            )}
         >
            <Textarea
               value={draft}
               placeholder={t('Enter personal guidance for the agent (optional)...')}
               onChange={(e) => setDraft(e.target.value)}
               onBlur={commit}
               className="min-h-36"
            />
            <p className="text-xs text-muted-foreground">
               {t('Saved automatically when you click away.')}
            </p>
         </SettingsSection>

         <SettingsSection
            title={t('Skills')}
            description={t(
               'Reusable prompts auto-selected by the agent or invoked via slash commands'
            )}
         >
            <SettingsCard>
               <SettingsRow
                  title={t('No skills available')}
                  description={t('Skills are managed by your workspace operator')}
                  muted
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
