'use client';

import { Button } from '@/components/ui/button';
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
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
   createIssueTemplate,
   deleteIssueTemplate,
   fetchIssueTemplates,
   updateIssueTemplate,
} from '@/lib/api/issue-templates';
import type { IssueTemplateDTO } from '@/lib/api/types';
import { useTeamsStore } from '@/store/teams-store';
import { MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
   apiErrorMessage,
   SettingsCard,
   SettingsRow,
   SettingsSection,
   SettingsShell,
} from './shared';

const ALL_TEAMS = '__all__';

/** Create/edit dialog for an issue template. Omit `editing` to create. */
function TemplateDialog({
   open,
   onOpenChange,
   editing,
   onSaved,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   editing?: IssueTemplateDTO;
   onSaved: () => Promise<void>;
}) {
   const teams = useTeamsStore((s) => s.teams);
   const [name, setName] = useState('');
   const [description, setDescription] = useState('');
   const [icon, setIcon] = useState('📄');
   const [title, setTitle] = useState('');
   const [body, setBody] = useState('');
   const [teamValue, setTeamValue] = useState<string>(ALL_TEAMS);

   useEffect(() => {
      if (open) {
         setName(editing?.name ?? '');
         setDescription(editing?.description ?? '');
         setIcon(editing?.icon ?? '📄');
         setTitle(editing?.title ?? '');
         setBody(editing?.body ?? '');
         setTeamValue(editing?.teamId ?? ALL_TEAMS);
      }
   }, [open, editing]);

   const submit = async () => {
      if (!name.trim()) return;
      const payload = {
         name: name.trim(),
         description: description.trim(),
         icon: icon.trim() || '📄',
         title,
         body,
         teamId: teamValue === ALL_TEAMS ? null : teamValue,
      };
      try {
         if (editing) await updateIssueTemplate(editing.id, payload);
         else await createIssueTemplate(payload);
         await onSaved();
         onOpenChange(false);
      } catch (err) {
         toast.error(apiErrorMessage(err, 'Failed to save template'));
         console.error(err);
      }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>{editing ? 'Edit template' : 'New template'}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="template-name">Name</Label>
                  <Input
                     id="template-name"
                     autoFocus
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="Bug report"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="template-description">Description</Label>
                  <Input
                     id="template-description"
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     placeholder="What this template is for"
                  />
               </div>
               <div className="flex items-end gap-4">
                  <div className="flex flex-col gap-1.5 w-20">
                     <Label htmlFor="template-icon">Icon</Label>
                     <Input
                        id="template-icon"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        maxLength={4}
                        className="text-center"
                     />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                     <Label htmlFor="template-team">Team</Label>
                     <Select value={teamValue} onValueChange={setTeamValue}>
                        <SelectTrigger id="template-team">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value={ALL_TEAMS}>All teams</SelectItem>
                           {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                 {team.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="template-title">Title prefill</Label>
                  <Input
                     id="template-title"
                     value={title}
                     onChange={(e) => setTitle(e.target.value)}
                     placeholder="[Bug] "
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="template-body">Description prefill</Label>
                  <Textarea
                     id="template-body"
                     value={body}
                     onChange={(e) => setBody(e.target.value)}
                     placeholder="Steps to reproduce…"
                     className="min-h-24"
                  />
               </div>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
               </Button>
               <Button onClick={submit} disabled={!name.trim()}>
                  {editing ? 'Save' : 'Create'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

/** Workspace "Issue templates" settings: full CRUD over new-issue prefills. */
export default function IssueTemplatesSettings() {
   const teams = useTeamsStore((s) => s.teams);
   const [templates, setTemplates] = useState<IssueTemplateDTO[]>([]);
   const [loaded, setLoaded] = useState(false);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editing, setEditing] = useState<IssueTemplateDTO | undefined>(undefined);
   const [deleting, setDeleting] = useState<IssueTemplateDTO | null>(null);

   useEffect(() => {
      fetchIssueTemplates()
         .then(setTemplates)
         .catch((err) => {
            console.error(err);
            toast.error(apiErrorMessage(err, 'Failed to load templates'));
         })
         .finally(() => setLoaded(true));
   }, []);

   const refresh = async () => {
      setTemplates(await fetchIssueTemplates());
   };

   const openCreate = () => {
      setEditing(undefined);
      setDialogOpen(true);
   };
   const openEdit = (template: IssueTemplateDTO) => {
      setEditing(template);
      setDialogOpen(true);
   };

   const handleDelete = async () => {
      if (!deleting) return;
      const target = deleting;
      setDeleting(null);
      try {
         await deleteIssueTemplate(target.id);
         await refresh();
      } catch (err) {
         toast.error(apiErrorMessage(err, 'Failed to delete template'));
         console.error(err);
      }
   };

   const teamName = (teamId: string | null) =>
      (teamId && teams.find((team) => team.id === teamId)?.name) || 'All teams';

   return (
      <SettingsShell
         title="Issue templates"
         description="These templates are available when creating issues for any team in the workspace. To create templates that only apply to specific teams, add them as team templates."
      >
         <SettingsSection
            title={`${templates.length} issue templates`}
            action={
               <Button size="xs" onClick={openCreate}>
                  New template
               </Button>
            }
         >
            <SettingsCard>
               {templates.map((template) => (
                  <SettingsRow
                     key={template.id}
                     icon={<span className="text-base">{template.icon}</span>}
                     title={template.name}
                     description={
                        <>
                           <span className="block">
                              {template.description || (
                                 <span className="italic">No description</span>
                              )}
                           </span>
                           <span className="block text-muted-foreground/80">
                              Prefills the issue title and description
                           </span>
                        </>
                     }
                     trailing={
                        <>
                           <span className="hidden sm:inline">{teamName(template.teamId)}</span>
                           <DropdownMenu>
                              <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground shrink-0">
                                 <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => openEdit(template)}>
                                    Edit
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeleting(template)}
                                 >
                                    Delete
                                 </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                        </>
                     }
                  />
               ))}
               {loaded && templates.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                     No templates yet — create one to prefill new issues.
                  </div>
               )}
            </SettingsCard>
         </SettingsSection>

         <TemplateDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            editing={editing}
            onSaved={refresh}
         />

         <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete template</AlertDialogTitle>
                  <AlertDialogDescription>
                     {`Delete template "${deleting?.name}"? This cannot be undone.`}
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </SettingsShell>
   );
}
