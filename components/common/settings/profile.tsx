'use client';

import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { signOutAction } from '@/lib/auth-actions';
import { useMeStore } from '@/store/me-store';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

function timezones(): string[] {
   try {
      const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
         .supportedValuesOf;
      if (fn) return fn('timeZone');
   } catch {
      /* older runtime */
   }
   return [
      'UTC',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Shanghai',
      'Asia/Tokyo',
   ];
}

/** Personal "Profile" settings — edits the signed-in user. */
export default function Profile() {
   const me = useMeStore((s) => s.me);
   const saveProfile = useMeStore((s) => s.saveProfile);
   const { t } = useLanguage();

   const [name, setName] = useState('');
   const [jobTitle, setJobTitle] = useState('');
   const tzList = timezones();

   useEffect(() => {
      if (me) {
         setName(me.name);
         setJobTitle(me.jobTitle ?? '');
      }
   }, [me]);

   if (!me) {
      return (
         <SettingsShell title={t('Profile')}>
            <p className="text-sm text-muted-foreground">{t('Loading…')}</p>
         </SettingsShell>
      );
   }

   const commitName = () => {
      const v = name.trim();
      if (v && v !== me.name) saveProfile({ name: v });
      else setName(me.name);
   };
   const commitTitle = () => {
      const v = jobTitle.trim();
      if (v !== (me.jobTitle ?? '')) saveProfile({ jobTitle: v || null });
   };

   return (
      <SettingsShell title={t('Profile')}>
         <SettingsSection>
            <SettingsCard>
               <SettingsRow
                  title={t('Profile picture')}
                  trailing={
                     <Avatar className="size-9">
                        <AvatarImage src={me.avatarUrl ?? undefined} alt={me.name} />
                        <AvatarFallback>{me.name[0]}</AvatarFallback>
                     </Avatar>
                  }
               />
               <SettingsRow
                  title={t('Email')}
                  trailing={<span className="text-foreground">{me.email}</span>}
               />
               <SettingsRow
                  title={t('Full name')}
                  trailing={
                     <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="h-8 w-56"
                     />
                  }
               />
               <SettingsRow
                  title={t('Title')}
                  description={t('Your job title or role')}
                  trailing={
                     <Input
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        placeholder={t('Software engineer')}
                        className="h-8 w-56"
                     />
                  }
               />
               <SettingsRow
                  title={t('Timezone')}
                  description={t('Powers “local time” on your profile and member card')}
                  trailing={
                     <Select
                        value={me.timezone}
                        onValueChange={(v) => saveProfile({ timezone: v })}
                     >
                        <SelectTrigger className="h-8 w-56">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                           {tzList.map((tz) => (
                              <SelectItem key={tz} value={tz}>
                                 {tz}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  }
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection title={t('Workspace access')}>
            <SettingsCard>
               <SettingsRow
                  title={t('Role')}
                  description={t('Set by a workspace admin')}
                  trailing={<span className="text-foreground">{t(me.role)}</span>}
               />
               <SettingsRow
                  title={t('Sign out')}
                  trailing={
                     <form action={signOutAction}>
                        <Button size="xs" variant="ghost" type="submit">
                           {t('Sign out')}
                        </Button>
                     </form>
                  }
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
