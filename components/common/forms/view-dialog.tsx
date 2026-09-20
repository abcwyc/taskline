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
import type { View, ViewType } from '@/mock-data/views';
import { useViewsStore } from '@/store/views-store';
import { useLanguage } from '@/components/providers/language-provider';

export function ViewDialog({
   open,
   onOpenChange,
   view,
   teamId,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   view?: View;
   /** scope a newly-created view to a team */
   teamId?: string;
}) {
   const createView = useViewsStore((s) => s.createView);
   const updateView = useViewsStore((s) => s.updateView);
   const { t } = useLanguage();

   const [name, setName] = useState('');
   const [description, setDescription] = useState('');
   const [type, setType] = useState<ViewType>('issue');

   useEffect(() => {
      if (!open) return;
      setName(view?.name ?? '');
      setDescription(view?.description ?? '');
      setType(view?.type ?? 'issue');
   }, [open, view]);

   const submit = async () => {
      if (!name.trim()) return;
      if (view) {
         updateView(view.id, { name: name.trim(), description: description.trim(), type });
      } else {
         await createView({
            name: name.trim(),
            description: description.trim(),
            type,
            filter: {},
            teamId: teamId ?? null,
         });
      }
      onOpenChange(false);
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>{view ? t('Edit view') : t('New view')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="view-name">{t('Name')}</Label>
                  <Input
                     id="view-name"
                     autoFocus
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder={t('Blocked issues')}
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="view-desc">{t('Description')}</Label>
                  <Input
                     id="view-desc"
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     placeholder={t('What this view shows')}
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label>{t('Type')}</Label>
                  <Select value={type} onValueChange={(v) => setType(v as ViewType)}>
                     <SelectTrigger>
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="issue">{t('Issues')}</SelectItem>
                        <SelectItem value="project">{t('Projects')}</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <p className="text-xs text-muted-foreground">
                  {t(
                     'New views start with no filter (they show everything). Refine the filter from the view page.'
                  )}
               </p>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  {t('Cancel')}
               </Button>
               <Button onClick={submit} disabled={!name.trim()}>
                  {view ? t('Save') : t('Create')}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
