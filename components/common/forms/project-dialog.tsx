'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { PROJECT_ICON_NAMES, resolveProjectIcon } from '@/lib/api/project-icons';
import { priorities } from '@/mock-data/priorities';
import { health as healthOptions, Project } from '@/mock-data/projects';
import { displayOrderedStatus } from '@/mock-data/status';
import { useMembersStore } from '@/store/members-store';
import { useProjectsStore } from '@/store/projects-store';
import { useTeamsStore } from '@/store/teams-store';
import { useLanguage } from '@/components/providers/language-provider';
import {
   projectHealthLabel,
   projectPriorityLabel,
   projectStatusLabel,
} from '@/lib/project-localization';

const NONE = '__none__';

export function ProjectDialog({
   open,
   onOpenChange,
   project,
   defaultTeamId,
   onCreated,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   project?: Project;
   defaultTeamId?: string;
   onCreated?: (p: Project) => void;
}) {
   const createProject = useProjectsStore((s) => s.createProject);
   const updateProject = useProjectsStore((s) => s.updateProject);
   const teams = useTeamsStore((s) => s.teams);
   const members = useMembersStore((s) => s.members);
   const { locale, t } = useLanguage();

   const [name, setName] = useState('');
   const [iconKey, setIconKey] = useState('Box');
   const [teamId, setTeamId] = useState('');
   const [statusId, setStatusId] = useState('to-do');
   const [priorityId, setPriorityId] = useState('no-priority');
   const [healthId, setHealthId] = useState('no-update');
   const [leadId, setLeadId] = useState(NONE);
   const [startDate, setStartDate] = useState('');
   const [targetDate, setTargetDate] = useState('');

   useEffect(() => {
      if (!open) return;
      setName(project?.name ?? '');
      setIconKey(
         project ? ((project.icon as { displayName?: string }).displayName ?? 'Box') : 'Box'
      );
      setTeamId(project?.teamId ?? defaultTeamId ?? teams[0]?.id ?? '');
      setStatusId(project?.status.id ?? 'to-do');
      setPriorityId(project?.priority.id ?? 'no-priority');
      setHealthId(project?.health.id ?? 'no-update');
      setLeadId(project?.lead?.id ?? NONE);
      setStartDate(project?.startDate ?? new Date().toISOString().slice(0, 10));
      setTargetDate(project?.targetDate ?? '');
   }, [open, project, defaultTeamId, teams]);

   const submit = async () => {
      if (!name.trim() || !teamId) return;
      if (project) {
         updateProject(project.id, {
            name: name.trim(),
            icon: resolveProjectIcon(iconKey),
            teamId,
            status: displayOrderedStatus.find((s) => s.id === statusId) ?? displayOrderedStatus[0],
            priority: priorities.find((p) => p.id === priorityId) ?? priorities[0],
            health: healthOptions.find((h) => h.id === healthId) ?? healthOptions[0],
            lead: leadId === NONE ? undefined : members.find((m) => m.id === leadId),
            startDate: startDate || '',
            ...(targetDate ? { targetDate } : { targetDate: undefined }),
         });
      } else {
         const status =
            displayOrderedStatus.find((s) => s.id === statusId) ?? displayOrderedStatus[0];
         const priority = priorities.find((p) => p.id === priorityId) ?? priorities[0];
         const projectHealth = healthOptions.find((h) => h.id === healthId) ?? healthOptions[0];
         const lead = members.find((m) => m.id === leadId) ?? members[0];
         const draft: Project = {
            id: `pending-${Date.now()}`,
            name: name.trim(),
            icon: resolveProjectIcon(iconKey),
            status,
            priority,
            health: projectHealth,
            lead,
            teamId,
            labels: [],
            percentComplete: 0,
            startDate: startDate || new Date().toISOString().slice(0, 10),
            ...(targetDate ? { targetDate } : {}),
         };
         const saved = await createProject(draft);
         if (saved) onCreated?.(saved);
      }
      onOpenChange(false);
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>{project ? t('Edit project') : t('New project')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
               <div className="flex gap-3">
                  <F label={t('Icon')} className="w-24">
                     <Select value={iconKey} onValueChange={setIconKey}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                           {PROJECT_ICON_NAMES.map((i) => (
                              <SelectItem key={i} value={i}>
                                 {i}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </F>
                  <F label={t('Name')} className="flex-1">
                     <Input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={locale === 'zh-CN' ? '例如：移动端改版' : 'Mobile redesign'}
                     />
                  </F>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <F label={t('Team')}>
                     <Select value={teamId} onValueChange={setTeamId}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {teams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                 {t.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </F>
                  <F label={t('Lead')}>
                     <Select value={leadId} onValueChange={setLeadId}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value={NONE}>{t('No lead')}</SelectItem>
                           {members.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                 {m.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </F>
                  <F label={t('Status')}>
                     <Select value={statusId} onValueChange={setStatusId}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {displayOrderedStatus.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                 {projectStatusLabel(locale, s.id, s.name)}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </F>
                  <F label={t('Priority')}>
                     <Select value={priorityId} onValueChange={setPriorityId}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {priorities.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                 {projectPriorityLabel(locale, p.id, p.name)}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </F>
                  <F label={t('Health')}>
                     <Select value={healthId} onValueChange={setHealthId}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {healthOptions.map((h) => (
                              <SelectItem key={h.id} value={h.id}>
                                 {projectHealthLabel(locale, h.id, h.name)}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </F>
                  <div />
                  <F label={t('Start date')}>
                     <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                     />
                  </F>
                  <F label={t('Target date')}>
                     <Input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                     />
                  </F>
               </div>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  {t('Cancel')}
               </Button>
               <Button onClick={submit} disabled={!name.trim() || !teamId}>
                  {project ? t('Save') : t('Create')}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

function F({
   label,
   className,
   children,
}: {
   label: string;
   className?: string;
   children: React.ReactNode;
}) {
   return (
      <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
         <Label>{label}</Label>
         {children}
      </div>
   );
}
