'use client';

import { Button } from '@/components/ui/button';
import {
   StatusCheckIcon,
   StatusDuplicateIcon,
   StatusGearIcon,
   StatusPieIcon,
   StatusTriageIcon,
   StatusXIcon,
} from '@/mock-data/status';
import {
   createWorkflowState,
   deleteWorkflowState,
   fetchWorkflowStates,
   hydrateWorkflowStates,
   updateWorkflowState,
} from '@/lib/api/workflow-states';
import type { WorkflowStateDTO } from '@/lib/api/types';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus } from 'lucide-react';
import { apiErrorMessage, SettingsCard, SettingsSection } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

const STATUS_CATEGORIES = [
   'triage',
   'backlog',
   'unstarted',
   'started',
   'completed',
   'canceled',
] as const;

const STATUS_ICON_OPTIONS = [
   { value: 'circle', label: 'Circle' },
   { value: 'pie', label: 'Pie' },
   { value: 'check', label: 'Check' },
   { value: 'gear', label: 'Gear' },
   { value: 'triage', label: 'Triage' },
   { value: 'x', label: 'X' },
   { value: 'duplicate', label: 'Duplicate' },
] as const;

const DEFAULT_STATUS_COLOR = '#6e798a';

/** Map preset status keys (e.g. "in-progress") onto their generic icon shape. */
const ICON_SHAPES: Record<string, string> = {
   'in-progress': 'pie',
   'technical-review': 'pie',
   'done': 'check',
   'paused': 'pie',
   'to-do': 'circle',
   'backlog': 'gear',
};

/** Small status icon preview rendered with the status's live color. */
function StatusIconPreview({ iconKey, color }: { iconKey: string; color: string }) {
   switch (ICON_SHAPES[iconKey] ?? iconKey) {
      case 'check':
         return <StatusCheckIcon color={color} />;
      case 'gear':
         return <StatusGearIcon color={color} />;
      case 'triage':
         return <StatusTriageIcon color={color} />;
      case 'x':
         return <StatusXIcon color={color} />;
      case 'duplicate':
         return <StatusDuplicateIcon color={color} />;
      case 'circle':
         return <StatusPieIcon color={color} fraction={0} />;
      default:
         return <StatusPieIcon color={color} fraction={0.4} />;
   }
}

/** Create/edit dialog for a workflow status. Omit `editing` to create. */
function WorkflowStateDialog({
   open,
   onOpenChange,
   editing,
   onSaved,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   editing?: WorkflowStateDTO;
   onSaved: () => Promise<void>;
}) {
   const { t } = useLanguage();
   const [name, setName] = useState('');
   const [color, setColor] = useState(DEFAULT_STATUS_COLOR);
   const [category, setCategory] = useState<string>('started');
   const [iconKey, setIconKey] = useState<string>('circle');

   useEffect(() => {
      if (open) {
         setName(editing?.name ?? '');
         setColor(editing?.color ?? DEFAULT_STATUS_COLOR);
         setCategory(editing?.category ?? 'started');
         setIconKey(editing?.iconKey ?? 'circle');
      }
   }, [open, editing]);

   const submit = async () => {
      if (!name.trim()) return;
      const body = { name: name.trim(), color, category, iconKey };
      try {
         if (editing) await updateWorkflowState(editing.id, body);
         else await createWorkflowState(body);
         await onSaved();
         onOpenChange(false);
      } catch (err) {
         toast.error(apiErrorMessage(err, t('Failed to save status')));
         console.error(err);
      }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>{editing ? t('Edit status') : t('New status')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status-name">{t('Name')}</Label>
                  <Input
                     id="status-name"
                     autoFocus
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && submit()}
                     placeholder={t('In review')}
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status-color">{t('Color')}</Label>
                  <Input
                     id="status-color"
                     type="color"
                     value={color}
                     onChange={(e) => setColor(e.target.value)}
                     className="w-14 px-1 cursor-pointer"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status-category">{t('Category')}</Label>
                  <Select value={category} onValueChange={setCategory}>
                     <SelectTrigger id="status-category">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        {STATUS_CATEGORIES.map((c) => (
                           <SelectItem key={c} value={c}>
                              <span className="capitalize">
                                 {t(c.charAt(0).toUpperCase() + c.slice(1))}
                              </span>
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status-icon">{t('Icon')}</Label>
                  <Select value={iconKey} onValueChange={setIconKey}>
                     <SelectTrigger id="status-icon">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        {STATUS_ICON_OPTIONS.map((option) => (
                           <SelectItem key={option.value} value={option.value}>
                              {t(option.label)}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  {t('Cancel')}
               </Button>
               <Button onClick={submit} disabled={!name.trim()}>
                  {editing ? t('Save') : t('Create')}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

/**
 * "Workflow statuses" settings section: full CRUD over the org's statuses.
 * Statuses are workspace-wide (issues and projects share them), so this
 * section is reused by both the team settings and the workspace
 * "Project statuses" page.
 */
export function WorkflowStatusesSection({
   title = 'Workflow statuses',
   description = 'Customize the statuses issues and projects go through',
}: {
   title?: string;
   description?: string;
}) {
   const { t } = useLanguage();
   const [states, setStates] = useState<WorkflowStateDTO[]>([]);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editing, setEditing] = useState<WorkflowStateDTO | undefined>(undefined);
   const [deleting, setDeleting] = useState<WorkflowStateDTO | null>(null);

   useEffect(() => {
      fetchWorkflowStates()
         .then(setStates)
         .catch((err) => console.error(err));
   }, []);

   const refresh = async () => {
      setStates(await fetchWorkflowStates());
      await hydrateWorkflowStates();
   };

   const openCreate = () => {
      setEditing(undefined);
      setDialogOpen(true);
   };
   const openEdit = (state: WorkflowStateDTO) => {
      setEditing(state);
      setDialogOpen(true);
   };

   const handleDelete = async () => {
      if (!deleting) return;
      const target = deleting;
      setDeleting(null);
      try {
         await deleteWorkflowState(target.id);
         await refresh();
      } catch (err) {
         toast.error(apiErrorMessage(err, t('Failed to delete status')));
         console.error(err);
      }
   };

   return (
      <SettingsSection
         title={t(title)}
         description={t(description)}
         action={
            <Button size="xs" onClick={openCreate}>
               <Plus className="size-4 md:mr-1" />
               {t('Add status')}
            </Button>
         }
      >
         <SettingsCard>
            {states.map((state) => (
               <div key={state.id} className="w-full flex items-center gap-3 px-4 py-2.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-md bg-muted/50 shrink-0">
                     <StatusIconPreview iconKey={state.iconKey} color={state.color} />
                  </span>
                  <div className="flex-1 min-w-0">
                     <div className="text-sm font-medium flex items-center gap-2">
                        <span className="truncate">{t(state.name)}</span>
                        {state.inUse && (
                           <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              {t('In use')}
                           </Badge>
                        )}
                     </div>
                     <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {t(state.category.charAt(0).toUpperCase() + state.category.slice(1))}
                     </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                     <Button size="xs" variant="ghost" onClick={() => openEdit(state)}>
                        {t('Edit')}
                     </Button>
                     {state.inUse ? (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <span className="inline-flex">
                                 <Button size="xs" variant="ghost" disabled>
                                    {t('Delete')}
                                 </Button>
                              </span>
                           </TooltipTrigger>
                           <TooltipContent>{t('In use by issues or projects')}</TooltipContent>
                        </Tooltip>
                     ) : (
                        <Button
                           size="xs"
                           variant="ghost"
                           className="text-destructive"
                           onClick={() => setDeleting(state)}
                        >
                           {t('Delete')}
                        </Button>
                     )}
                  </div>
               </div>
            ))}
            {states.length === 0 && (
               <div className="px-4 py-3 text-sm text-muted-foreground">{t('No statuses')}</div>
            )}
         </SettingsCard>

         <WorkflowStateDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            editing={editing}
            onSaved={refresh}
         />

         <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>{t('Delete status')}</AlertDialogTitle>
                  <AlertDialogDescription>
                     {t(
                        'Delete status "{name}"? Issues and projects using it must be moved to another status first.'
                     ).replace('{name}', deleting?.name ?? '')}
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t('Delete')}</AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </SettingsSection>
   );
}
