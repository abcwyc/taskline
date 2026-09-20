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
import { cn } from '@/lib/utils';
import type { Team } from '@/mock-data/teams';
import { useTeamsStore } from '@/store/teams-store';
import { useLanguage } from '@/components/providers/language-provider';

const ICONS = ['📋', '🛠️', '🎨', '📱', '🌐', '📊', '🧠', '☁️', '🔒', '✅', '🚀', '⚡', '☀️'];
const COLORS = [
   '#eb5757',
   '#f2994a',
   '#f2c94c',
   '#4cb782',
   '#26b5ce',
   '#5e6ad2',
   '#9b59b6',
   '#95a2b3',
];

export function TeamDialog({
   open,
   onOpenChange,
   team,
   onCreated,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   team?: Team;
   onCreated?: (t: Team) => void;
}) {
   const createTeam = useTeamsStore((s) => s.createTeam);
   const updateTeam = useTeamsStore((s) => s.updateTeam);
   const { t } = useLanguage();

   const [name, setName] = useState('');
   const [icon, setIcon] = useState(ICONS[0]);
   const [color, setColor] = useState(COLORS[5]);

   useEffect(() => {
      if (!open) return;
      setName(team?.name ?? '');
      setIcon(team?.icon ?? ICONS[0]);
      setColor(team?.color ?? COLORS[5]);
   }, [open, team]);

   const submit = async () => {
      if (!name.trim()) return;
      if (team) {
         updateTeam(team.id, { name: name.trim(), icon, color });
      } else {
         const created = await createTeam({ name: name.trim(), icon, color });
         if (created) onCreated?.(created);
      }
      onOpenChange(false);
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>{team ? t('Team settings') : t('Create a team')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="team-name">{t('Name')}</Label>
                  <Input
                     id="team-name"
                     autoFocus
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder={t('Mobile')}
                  />
                  {!team && (
                     <p className="text-xs text-muted-foreground">
                        {t('A short key (e.g. {name}) is generated from the name.').replace(
                           '{name}',
                           name.slice(0, 4).toUpperCase() || 'MOBI'
                        )}
                     </p>
                  )}
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label>{t('Icon')}</Label>
                  <div className="flex flex-wrap gap-1.5">
                     {ICONS.map((i) => (
                        <button
                           key={i}
                           type="button"
                           onClick={() => setIcon(i)}
                           className={cn(
                              'size-8 rounded-md text-base transition',
                              icon === i ? 'bg-accent ring-1 ring-foreground' : 'hover:bg-accent/50'
                           )}
                        >
                           {i}
                        </button>
                     ))}
                  </div>
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label>{t('Color')}</Label>
                  <div className="flex flex-wrap gap-1.5">
                     {COLORS.map((c) => (
                        <button
                           key={c}
                           type="button"
                           onClick={() => setColor(c)}
                           className={cn(
                              'size-6 rounded-full ring-offset-2 ring-offset-background transition',
                              color === c && 'ring-2 ring-foreground'
                           )}
                           style={{ backgroundColor: c }}
                        />
                     ))}
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  {t('Cancel')}
               </Button>
               <Button onClick={submit} disabled={!name.trim()}>
                  {team ? t('Save') : t('Create')}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
