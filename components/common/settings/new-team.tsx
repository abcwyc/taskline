'use client';

import { Button } from '@/components/ui/button';
import { TeamDialog } from '@/components/common/forms/team-dialog';
import { useTeamsStore } from '@/store/teams-store';
import { Check, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

/** "Join or create a team" settings page. */
export default function NewTeam() {
   const teams = useTeamsStore((s) => s.teams);
   const updateTeam = useTeamsStore((s) => s.updateTeam);
   const { orgId } = useParams<{ orgId: string }>();
   const router = useRouter();
   const [open, setOpen] = useState(false);
   const { t } = useLanguage();
   const notJoined = teams.filter((team) => !team.joined);

   return (
      <SettingsShell
         title={t('Join or create a team')}
         description={t(
            'Teams organize issues, cycles and projects around the people working together'
         )}
      >
         <SettingsSection title={t('Create a new team')}>
            <SettingsCard>
               <div className="flex items-center justify-between gap-3 p-4">
                  <p className="text-sm text-muted-foreground">
                     {t('Start a new team with its own issues, cycles and projects.')}
                  </p>
                  <Button size="xs" onClick={() => setOpen(true)}>
                     <Plus className="size-3.5" />
                     {t('Create team')}
                  </Button>
               </div>
            </SettingsCard>
         </SettingsSection>

         <SettingsSection title={t('Join an existing team')}>
            <SettingsCard>
               {notJoined.map((team) => (
                  <SettingsRow
                     key={team.id}
                     icon={<span className="text-sm">{team.icon}</span>}
                     title={team.name}
                     description={`${team.members.length} ${t('members')} · ${team.projects.length} ${t('projects')}`}
                     trailing={
                        <Button
                           size="xs"
                           variant="secondary"
                           onClick={() => updateTeam(team.id, { joined: true })}
                        >
                           <Check className="size-3.5" />
                           {t('Join')}
                        </Button>
                     }
                  />
               ))}
               {notJoined.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4">
                     {t("You're a member of every team.")}
                  </p>
               )}
            </SettingsCard>
         </SettingsSection>

         <TeamDialog
            open={open}
            onOpenChange={setOpen}
            onCreated={(t) => router.push(`/${orgId}/team/${t.id}/all`)}
         />
      </SettingsShell>
   );
}
