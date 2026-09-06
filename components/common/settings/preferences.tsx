'use client';

import { useState } from 'react';

import { CustomizeSidebarDialog } from '@/components/layout/sidebar/customize-sidebar-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { Preferences } from '@/lib/api/preferences';
import { useMeStore } from '@/store/me-store';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell, SelectMenu } from './shared';
import { ThemePreferences } from './theme-preferences';

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
   return (
      <SettingsShell title="Preferences">
         <SettingsSection title="General">
            <SettingsCard>
               <SettingsRow
                  title="Default home view"
                  description="Which view opens when you launch the app"
                  trailing={
                     <PrefSelect
                        name="defaultHomeView"
                        options={[
                           ['agent', 'Agent'],
                           ['inbox', 'Inbox'],
                           ['my-issues', 'My issues'],
                        ]}
                     />
                  }
               />
               <SettingsRow
                  title="Display names"
                  description="How names are shown across the interface"
                  trailing={
                     <PrefSelect
                        name="displayNames"
                        options={[
                           ['full-name', 'Full name'],
                           ['username', 'Username'],
                        ]}
                     />
                  }
               />
               <SettingsRow
                  title="First day of the week"
                  description="Used for date pickers"
                  trailing={
                     <PrefSelect
                        name="firstDayOfWeek"
                        options={[
                           ['monday', 'Monday'],
                           ['sunday', 'Sunday'],
                           ['saturday', 'Saturday'],
                        ]}
                     />
                  }
               />
               <SettingsRow
                  title="Convert text emoticons into emojis"
                  description="Strings like :) become 🙂"
                  trailing={<PrefSwitch name="emoticonsToEmoji" />}
               />
               <SettingsRow
                  title="Submit comments with"
                  description="Key press that sends a comment"
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

         <SettingsSection title="Interface and theme">
            <SettingsCard>
               <SettingsRow
                  title="App sidebar"
                  description="Customize sidebar item visibility, ordering, and badge style"
                  trailing={
                     <Button size="xs" variant="ghost" onClick={() => setCustomizeOpen(true)}>
                        Customize
                     </Button>
                  }
               />
               <SettingsRow
                  title="Font size"
                  description="Adjust the size of text across the app"
                  trailing={
                     <PrefSelect
                        name="fontSize"
                        options={[
                           ['default', 'Default'],
                           ['small', 'Small'],
                           ['large', 'Large'],
                        ]}
                     />
                  }
               />
               <SettingsRow
                  title="Use pointer cursors"
                  description="Show a pointer cursor over interactive elements"
                  trailing={<PrefSwitch name="pointerCursors" />}
               />
               <SettingsRow
                  title="Underline links"
                  description="Always underline links in text content"
                  trailing={<PrefSwitch name="underlineLinks" />}
               />
            </SettingsCard>
            <ThemePreferences />
         </SettingsSection>

         <SettingsSection title="Automations">
            <SettingsCard>
               <SettingsRow
                  title="Auto-assign new issues to me"
                  description="New issues you create default to you as the assignee"
                  trailing={<PrefSwitch name="autoAssignSelf" />}
               />
               <SettingsRow
                  title="Assign to me when I start an issue"
                  description="Moving an unassigned issue to a started status assigns it to you"
                  trailing={<PrefSwitch name="assignSelfOnStart" />}
               />
            </SettingsCard>
         </SettingsSection>
         <CustomizeSidebarDialog open={customizeOpen} onOpenChange={setCustomizeOpen} />
      </SettingsShell>
   );
}
