'use client';

import { useState } from 'react';

import { CustomizeSidebarDialog } from '@/components/layout/sidebar/customize-sidebar-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { Preferences } from '@/lib/api/preferences';
import { useMeStore } from '@/store/me-store';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell, SelectMenu } from './shared';
import { ThemePreferences } from './theme-preferences';
import { useLanguage } from '@/components/providers/language-provider';

/** Bind a boolean preference to a <Switch>. */
function PrefSwitch({ name }: { name: keyof Preferences }) {
   const value = useMeStore((s) => s.preferences[name]) as boolean;
   const setPreference = useMeStore((s) => s.setPreference);
   return <Switch checked={value} onCheckedChange={(v) => setPreference(name, v as never)} />;
}

/** Bind an enum preference to the settings <SelectMenu> (label<->value map). */
function PrefSelect({
   name,
   options,
}: {
   name: keyof Preferences;
   options: [value: string, label: string][];
}) {
   const value = useMeStore((s) => s.preferences[name]) as string;
   const setPreference = useMeStore((s) => s.setPreference);
   const labels = options.map(([, l]) => l);
   const current = options.find(([v]) => v === value)?.[1] ?? labels[0];
   return (
      <SelectMenu
         options={labels}
         value={current}
         onChange={(label) => {
            const hit = options.find(([, l]) => l === label);
            if (hit) setPreference(name, hit[0] as never);
         }}
      />
   );
}

/** Personal "Preferences" settings (general, theme, automations). */
export default function Preferences() {
   const [customizeOpen, setCustomizeOpen] = useState(false);
   const { t } = useLanguage();
   return (
      <SettingsShell title={t('Preferences')}>
         <SettingsSection title={t('General')}>
            <SettingsCard>
               <SettingsRow
                  title={t('Language')}
                  description={t('Choose the language used across the interface')}
                  trailing={
                     <PrefSelect
                        name="language"
                        options={[
                           ['system', t('Browser default')],
                           ['en', t('English')],
                           ['zh-CN', t('Simplified Chinese')],
                        ]}
                     />
                  }
               />
               <SettingsRow
                  title={t('Default home view')}
                  description={t('Which view opens when you launch the app')}
                  trailing={
                     <PrefSelect
                        name="defaultHomeView"
                        options={[
                           ['agent', t('Agent')],
                           ['inbox', t('Inbox')],
                           ['my-issues', t('My issues')],
                        ]}
                     />
                  }
               />
               <SettingsRow
                  title={t('Display names')}
                  description={t('How names are shown across the interface')}
                  trailing={
                     <PrefSelect
                        name="displayNames"
                        options={[
                           ['full-name', t('Full name')],
                           ['username', t('Username')],
                        ]}
                     />
                  }
               />
               <SettingsRow
                  title={t('First day of the week')}
                  description={t('Used for date pickers')}
                  trailing={
                     <PrefSelect
                        name="firstDayOfWeek"
                        options={[
                           ['monday', t('Monday')],
                           ['sunday', t('Sunday')],
                           ['saturday', t('Saturday')],
                        ]}
                     />
                  }
               />
               <SettingsRow
                  title={t('Convert text emoticons into emojis')}
                  description={t('Strings like :) become 🙂')}
                  trailing={<PrefSwitch name="emoticonsToEmoji" />}
               />
               <SettingsRow
                  title={t('Submit comments with')}
                  description={t('Key press that sends a comment')}
                  trailing={
                     <PrefSelect
                        name="submitCommentOn"
                        options={[
                           ['mod-enter', '⌘+Enter'],
                           ['enter', 'Enter'],
                        ]}
                     />
                  }
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection title={t('Interface and theme')}>
            <SettingsCard>
               <SettingsRow
                  title={t('App sidebar')}
                  description={t('Customize sidebar item visibility, ordering, and badge style')}
                  trailing={
                     <Button size="xs" variant="ghost" onClick={() => setCustomizeOpen(true)}>
                        {t('Customize')}
                     </Button>
                  }
               />
               <SettingsRow
                  title={t('Font size')}
                  description={t('Adjust the size of text across the app')}
                  trailing={
                     <PrefSelect
                        name="fontSize"
                        options={[
                           ['default', t('Default')],
                           ['small', t('Small')],
                           ['large', t('Large')],
                        ]}
                     />
                  }
               />
               <SettingsRow
                  title={t('Use pointer cursors')}
                  description={t('Show a pointer cursor over interactive elements')}
                  trailing={<PrefSwitch name="pointerCursors" />}
               />
               <SettingsRow
                  title={t('Underline links')}
                  description={t('Always underline links in text content')}
                  trailing={<PrefSwitch name="underlineLinks" />}
               />
            </SettingsCard>
            <ThemePreferences />
         </SettingsSection>

         <SettingsSection title={t('Automations')}>
            <SettingsCard>
               <SettingsRow
                  title={t('Auto-assign new issues to me')}
                  description={t('New issues you create default to you as the assignee')}
                  trailing={<PrefSwitch name="autoAssignSelf" />}
               />
               <SettingsRow
                  title={t('Assign to me when I start an issue')}
                  description={t(
                     'Moving an unassigned issue to a started status assigns it to you'
                  )}
                  trailing={<PrefSwitch name="assignSelfOnStart" />}
               />
            </SettingsCard>
         </SettingsSection>
         <CustomizeSidebarDialog open={customizeOpen} onOpenChange={setCustomizeOpen} />
      </SettingsShell>
   );
}
