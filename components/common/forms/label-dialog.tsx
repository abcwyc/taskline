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
import type { LabelInterface } from '@/mock-data/labels';
import { useLabelsStore } from '@/store/labels-store';
import { useLanguage } from '@/components/providers/language-provider';

export const LABEL_COLORS = [
   'red',
   'orange',
   'yellow',
   'green',
   'teal',
   'cyan',
   'blue',
   'indigo',
   'purple',
   'pink',
   'gray',
] as const;

export function LabelDialog({
   open,
   onOpenChange,
   label,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   /** omit to create */
   label?: LabelInterface;
}) {
   const createLabel = useLabelsStore((s) => s.createLabel);
   const updateLabel = useLabelsStore((s) => s.updateLabel);
   const { t } = useLanguage();
   const [name, setName] = useState('');
   const [color, setColor] = useState<string>('gray');

   useEffect(() => {
      if (open) {
         setName(label?.name ?? '');
         setColor(label?.color ?? 'gray');
      }
   }, [open, label]);

   const submit = async () => {
      if (!name.trim()) return;
      if (label) updateLabel(label.id, { name: name.trim(), color });
      else await createLabel({ name: name.trim(), color });
      onOpenChange(false);
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>{label ? t('Edit label') : t('New label')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="label-name">{t('Name')}</Label>
                  <Input
                     id="label-name"
                     value={name}
                     autoFocus
                     onChange={(e) => setName(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && submit()}
                     placeholder={t('Bug')}
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label>{t('Color')}</Label>
                  <div className="flex flex-wrap gap-1.5">
                     {LABEL_COLORS.map((c) => (
                        <button
                           key={c}
                           type="button"
                           onClick={() => setColor(c)}
                           className={cn(
                              'size-6 rounded-full ring-offset-2 ring-offset-background transition',
                              color === c && 'ring-2 ring-foreground'
                           )}
                           style={{ backgroundColor: c }}
                           aria-label={t(c)}
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
                  {label ? t('Save') : t('Create')}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
