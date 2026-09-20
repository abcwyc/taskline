'use client';

import { Button } from '@/components/ui/button';
import { TeamDialog } from '@/components/common/forms/team-dialog';
import { useCyclesStore } from '@/store/cycles-store';
import { useTeamsStore } from '@/store/teams-store';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
   Bot,
   ChevronRight,
   FileText,
   Lock,
   Radar,
   RefreshCcw,
   Repeat,
   Settings,
   Sparkles,
   Tag,
   Users,
   Workflow,
   Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SettingsCard, SettingsRow, SettingsSection } from './shared';
import { WorkflowStatusesSection } from './workflow-statuses-section';
import { useLanguage } from '@/components/providers/language-provider';

interface TeamSettingsProps {
   teamId: string;
}

/** Per-team settings page (general, workflow, AI and danger zone). */
export default function TeamSettings({ teamId }: TeamSettingsProps) {
   const { t } = useLanguage();
   const teams = useTeamsStore((s) => s.teams);
   const updateTeam = useTeamsStore((s) => s.updateTeam);
   const deleteTeam = useTeamsStore((s) => s.deleteTeam);
   const allCycles = useCyclesStore((s) => s.cycles);
   const cycles = useMemo(() => allCycles.filter((c) => c.teamId === teamId), [allCycles, teamId]);
   const { orgId } = useParams<{ orgId: string }>();
   const router = useRouter();
   const [editOpen, setEditOpen] = useState(false);
   const team = teams.find((candidate) => candidate.id === teamId);

   if (!team) {
      return (
         <div className="max-w-2xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-medium">{t('Team not found')}</h1>
         </div>
      );
   }

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-2xl mx-auto px-6 py-10 pb-20">
            <div className="flex items-center gap-3">
               <span className="inline-flex size-9 bg-muted/50 items-center justify-center rounded-md text-lg">
                  {team.icon}
               </span>
               <div className="flex-1">
                  <h1 className="text-2xl font-medium">{team.name}</h1>
                  <p className="text-sm text-muted-foreground">
                     {t('Accessible to all workspace members')}
                  </p>
               </div>
               <Button size="xs" variant="secondary" onClick={() => setEditOpen(true)}>
                  {t('Edit')}
               </Button>
               <Link
                  href={`/${orgId}/team/${team.id}/overview`}
                  className="text-sm inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
               >
                  {t('Team overview')}
                  <ChevronRight className="size-4" />
               </Link>
            </div>

            <div className="flex flex-col gap-10 mt-10">
               <SettingsSection>
                  <SettingsCard>
                     <SettingsRow
                        icon={<Settings className="size-4" />}
                        title={t('General')}
                        description={t(
                           'Name, identifier, timezone, estimates, and broader settings'
                        )}
                     />
                     <SettingsRow
                        icon={<Lock className="size-4" />}
                        title={t('Access and permissions')}
                        description={t(
                           'Manage team access and who in the team can take certain actions'
                        )}
                     />
                     <SettingsRow
                        icon={<Users className="size-4" />}
                        title={t('Members')}
                        description={t('Manage team members')}
                        trailing={
                           <span>
                              {team.members.length} {t('members')}
                           </span>
                        }
                     />
                     <SettingsRow
                        icon={<Zap className="size-4" />}
                        title={t('Slack notifications')}
                        description={t('Broadcast notifications to Slack')}
                        trailing={<span>{t('Off')}</span>}
                     />
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection title={t('Issues, projects, and docs')}>
                  <SettingsCard>
                     <SettingsRow
                        icon={<Tag className="size-4" />}
                        title={t('Issue labels')}
                        description={t("Labels available to this team's issues")}
                        trailing={<span>7 {t('labels')}</span>}
                     />
                     <SettingsRow
                        icon={<FileText className="size-4" />}
                        title={t('Templates')}
                        description={t('Pre-filled templates for issues, documents, and projects')}
                        trailing={<span>3 {t('templates')}</span>}
                     />
                     <SettingsRow
                        icon={<Repeat className="size-4" />}
                        title={t('Recurring issues')}
                        description={t('Automatically create issues on a schedule')}
                        trailing={<span>{t('None')}</span>}
                     />
                  </SettingsCard>
               </SettingsSection>

               <WorkflowStatusesSection />

               <SettingsSection title={t('Workflow')}>
                  <SettingsCard>
                     <SettingsRow
                        icon={<Workflow className="size-4" />}
                        title={t('Workflows & automations')}
                        description={t(
                           'Manage issue automations, git workflows and other workflows'
                        )}
                     />
                     <SettingsRow
                        icon={<Radar className="size-4" />}
                        title={t('Triage')}
                        description={t('Streamline how you handle requests from outside your team')}
                        trailing={<span>{t('Enabled')}</span>}
                     />
                     <SettingsRow
                        icon={<RefreshCcw className="size-4" />}
                        title={t('Cycles')}
                        description={t('Focus your team over short, time-boxed windows')}
                        trailing={<span>{cycles.length > 0 ? t('Every 2 weeks') : t('Off')}</span>}
                     />
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection title={t('AI & Agents')}>
                  <SettingsCard>
                     <SettingsRow
                        icon={<Bot className="size-4" />}
                        title={t('Team agents')}
                        description={t(
                           'Add guidance for how agents should operate within this team'
                        )}
                     />
                     <SettingsRow
                        icon={<Sparkles className="size-4" />}
                        title={t('Agent skills')}
                        description={t('Agent skills shared with this team')}
                        trailing={<span>{t('None')}</span>}
                     />
                     <SettingsRow
                        icon={<RefreshCcw className="size-4" />}
                        title={t('Loops')}
                        description={t(
                           'Automated agent workflows that run on a schedule or when an issue is updated'
                        )}
                        trailing={<span>{t('None')}</span>}
                     />
                     <SettingsRow
                        icon={<Zap className="size-4" />}
                        title={t('Project updates')}
                        description={t(
                           'Automatically generate updates using recent activity and defined rules'
                        )}
                     />
                     <SettingsRow
                        icon={<FileText className="size-4" />}
                        title={t('Resolved thread summaries')}
                        description={t('Automatically generate summaries for resolved threads')}
                     />
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection
                  title={t('Team hierarchy')}
                  description={t(
                     'Teams can be nested to reflect your team structure and to share workflows and settings.'
                  )}
               >
                  <div />
               </SettingsSection>

               <SettingsSection title={t('Danger zone')}>
                  <SettingsCard>
                     <SettingsRow
                        title={team.joined ? t('Leave team') : t('Join team')}
                        description={
                           team.joined
                              ? t('Remove yourself as a member of this team')
                              : t('Add yourself as a member of this team')
                        }
                        trailing={
                           <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => updateTeam(team.id, { joined: !team.joined })}
                           >
                              {team.joined ? t('Leave team') : t('Join team')}
                           </Button>
                        }
                     />
                     <SettingsRow
                        title={t('Delete team')}
                        description={t(
                           'Permanently delete this team. Only empty teams (no projects, issues or cycles) can be deleted.'
                        )}
                        muted
                        trailing={
                           <Button
                              size="xs"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => {
                                 if (
                                    confirm(
                                       t('Delete team "{name}"? This cannot be undone.').replace(
                                          '{name}',
                                          team.name
                                       )
                                    )
                                 ) {
                                    deleteTeam(team.id);
                                    router.push(`/${orgId}/teams`);
                                 }
                              }}
                           >
                              {t('Delete...')}
                           </Button>
                        }
                     />
                  </SettingsCard>
               </SettingsSection>
            </div>
         </div>

         <TeamDialog open={editOpen} onOpenChange={setEditOpen} team={team} />
      </div>
   );
}
