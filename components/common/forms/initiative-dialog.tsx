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
import { Textarea } from '@/components/ui/textarea';
import type { Initiative, InitiativeStatus } from '@/mock-data/initiatives';
import { priorities } from '@/mock-data/priorities';
import { health as healthOptions } from '@/mock-data/projects';
import { useInitiativesStore } from '@/store/initiatives-store';
import { useMembersStore } from '@/store/members-store';
import { useTeamsStore } from '@/store/teams-store';
import { useLanguage } from '@/components/providers/language-provider';

const STATUSES: InitiativeStatus[] = ['active', 'planned', 'completed', 'canceled'];
const ICONS = ['🎯', '🧱', '♿', '🌱', '⚡', '🚀', '🔬', '📈', '🛡️', '🧭'];
const NONE = '__none__';

export function InitiativeDialog({
   open,
   onOpenChange,
   initiative,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   initiative?: Initiative;
}) {
   const createInitiative = useInitiativesStore((s) => s.createInitiative);
   const updateInitiative = useInitiativesStore((s) => s.updateInitiative);
   const members = useMembersStore((s) => s.members);
   const teams = useTeamsStore((s) => s.teams);
   const { t } = useLanguage();

   const [name, setName] = useState('');
   const [icon, setIcon] = useState(ICONS[0]);
   const [description, setDescription] = useState('');
   const [status, setStatus] = useState<InitiativeStatus>('active');
   const [priorityId, setPriorityId] = useState('no-priority');
   const [healthId, setHealthId] = useState('no-update');
   const [ownerId, setOwnerId] = useState(NONE);
   const [leadTeamId, setLeadTeamId] = useState(NONE);

   useEffect(() => {
      if (!open) return;
      setName(initiative?.name ?? '');
      setIcon(initiative?.icon ?? ICONS[0]);
      setDescription(initiative?.description ?? '');
      setStatus(initiative?.status ?? 'active');
      setPriorityId(initiative?.priority.id ?? 'no-priority');
      setHealthId(initiative?.health.id ?? 'no-update');
      setOwnerId(initiative?.owner?.id ?? NONE);
      setLeadTeamId(initiative?.leadTeamId ?? NONE);
   }, [open, initiative]);

   const submit = async () => {
      if (!name.trim()) return;
      if (initiative) {
         updateInitiative(initiative.id, {
            name: name.trim(),
            icon,
            description: description.trim() || undefined,
            status,
            priority: priorities.find((p) => p.id === priorityId) ?? priorities[0],
            health: healthOptions.find((h) => h.id === healthId) ?? healthOptions[0],
            owner: ownerId === NONE ? undefined : members.find((m) => m.id === ownerId),
            leadTeamId: leadTeamId === NONE ? undefined : leadTeamId,
         });
      } else {
         await createInitiative({
            name: name.trim(),
            icon,
            description: description.trim() || null,
            status,
            priorityId,
            healthId,
            ownerId: ownerId === NONE ? null : ownerId,
            leadTeamId: leadTeamId === NONE ? null : leadTeamId,
         });
      }
      onOpenChange(false);
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>{initiative ? t('Edit initiative') : t('New initiative')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
               <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5">
                     <Label>{t('Icon')}</Label>
                     <Select value={icon} onValueChange={setIcon}>
                        <SelectTrigger className="w-16 text-base">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {ICONS.map((i) => (
                              <SelectItem key={i} value={i}>
                                 {i}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                     <Label htmlFor="init-name">{t('Name')}</Label>
                     <Input
                        id="init-name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('Ship the component platform')}
                     />
                  </div>
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="init-desc">{t('Description')}</Label>
                  <Textarea
                     id="init-desc"
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     rows={2}
                  />
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <Field label={t('Status')}>
                     <Select value={status} onValueChange={(v) => setStatus(v as InitiativeStatus)}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                 {t(s)}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </Field>
                  <Field label={t('Priority')}>
                     <Select value={priorityId} onValueChange={setPriorityId}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {priorities.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                 {t(p.name)}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </Field>
                  <Field label={t('Health')}>
                     <Select value={healthId} onValueChange={setHealthId}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {healthOptions.map((h) => (
                              <SelectItem key={h.id} value={h.id}>
                                 {t(h.name)}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </Field>
                  <Field label={t('Owner')}>
                     <Select value={ownerId} onValueChange={setOwnerId}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value={NONE}>{t('No owner')}</SelectItem>
                           {members.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                 {m.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </Field>
                  <Field label={t('Lead team')}>
                     <Select value={leadTeamId} onValueChange={setLeadTeamId}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value={NONE}>{t('No lead team')}</SelectItem>
                           {teams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                 {t.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </Field>
               </div>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  {t('Cancel')}
               </Button>
               <Button onClick={submit} disabled={!name.trim()}>
                  {initiative ? t('Save') : t('Create')}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
   return (
      <div className="flex flex-col gap-1.5">
         <Label>{label}</Label>
         {children}
      </div>
   );
}
