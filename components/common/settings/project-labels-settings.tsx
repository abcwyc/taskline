'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { LabelInterface } from '@/mock-data/labels';
import type { Project } from '@/mock-data/projects';
import { useLabelsStore } from '@/store/labels-store';
import { useProjectsStore } from '@/store/projects-store';
import { Plus, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { SettingsCard, SettingsSection, SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

/** One label chip with a remove "X" that appears on hover. */
function LabelChip({ label, onRemove }: { label: LabelInterface; onRemove: () => void }) {
   const { t } = useLanguage();
   return (
      <Badge
         variant="outline"
         className="group/chip gap-1.5 rounded-full text-muted-foreground bg-background hover:bg-accent/50 transition-colors"
      >
         <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: label.color }}
            aria-hidden="true"
         />
         {t(label.name)}
         <button
            type="button"
            onClick={onRemove}
            aria-label={`${t('Remove label')} ${label.name}`}
            className="text-muted-foreground/60 hover:text-foreground transition-colors"
         >
            <X className="size-3 opacity-0 group-hover/chip:opacity-100 transition-opacity" />
         </button>
      </Badge>
   );
}

/** Popover to attach an existing label or create + attach a new one. */
function AddLabelPopover({ project }: { project: Project }) {
   const { t } = useLanguage();
   const labels = useLabelsStore((s) => s.labels);
   const createLabel = useLabelsStore((s) => s.createLabel);
   const updateProject = useProjectsStore((s) => s.updateProject);
   const [open, setOpen] = useState(false);
   const [newName, setNewName] = useState('');

   const available = labels.filter(
      (label) => !project.labels.some((attached) => attached.id === label.id)
   );

   const attach = (label: LabelInterface) => {
      updateProject(project.id, { labels: [...project.labels, label] });
      setOpen(false);
   };

   const handleCreate = async () => {
      if (!newName.trim()) return;
      const label = await createLabel({ name: newName.trim(), color: 'gray' });
      if (label) attach(label);
      setNewName('');
   };

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               size="xs"
               variant="secondary"
               className="gap-1 rounded-full"
               aria-label={`${t('Add label to')} ${project.name}`}
            >
               <Plus className="size-3.5" />
               {t('Label')}
            </Button>
         </PopoverTrigger>
         <PopoverContent className="border-input w-56 p-0" align="start">
            <Command>
               <CommandInput placeholder={t('Search labels...')} />
               <CommandList>
                  <CommandEmpty>{t('No labels found.')}</CommandEmpty>
                  <CommandGroup>
                     {available.map((label) => (
                        <CommandItem
                           key={label.id}
                           value={label.id}
                           onSelect={() => attach(label)}
                           className="gap-2"
                        >
                           <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: label.color }}
                           />
                           {t(label.name)}
                        </CommandItem>
                     ))}
                     {available.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                           {t('All workspace labels are attached.')}
                        </div>
                     )}
                  </CommandGroup>
               </CommandList>
               <div className="border-t border-border/60 p-2 flex items-center gap-1.5">
                  <Input
                     value={newName}
                     onChange={(e) => setNewName(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                     placeholder={t('New label name...')}
                     className="h-7 text-xs"
                  />
                  <Button
                     size="xs"
                     variant="secondary"
                     onClick={handleCreate}
                     disabled={!newName.trim()}
                  >
                     {t('Create')}
                  </Button>
               </div>
            </Command>
         </PopoverContent>
      </Popover>
   );
}

/**
 * Workspace "Project labels" settings. Labels themselves are org-wide
 * (managed under Issue labels); each project carries a subset of them.
 */
export default function ProjectLabelsSettings() {
   const { t } = useLanguage();
   const projects = useProjectsStore((s) => s.projects);
   const updateProject = useProjectsStore((s) => s.updateProject);

   const removeLabel = (project: Project, label: LabelInterface) => {
      updateProject(project.id, {
         labels: project.labels.filter((attached) => attached.id !== label.id),
      });
   };

   return (
      <SettingsShell
         title={t('Project labels')}
         description={t(
            'Labels are shared across the workspace — manage the full set under Issue labels. Here you choose which labels each project carries.'
         )}
      >
         <SettingsSection title={`${projects.length} ${t('projects')}`}>
            <SettingsCard>
               {projects.map((project) => (
                  <div key={project.id} className="flex items-start gap-3 px-4 py-3">
                     <span className="inline-flex size-8 items-center justify-center rounded-md bg-muted/50 shrink-0 text-muted-foreground">
                        <project.icon className="size-4" />
                     </span>
                     <div className="flex-1 min-w-0 py-0.5">
                        <div className="text-sm font-medium truncate">{project.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                           <Tag className="size-3.5 text-muted-foreground/70 shrink-0" />
                           {project.labels.length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                 {t('No labels')}
                              </span>
                           )}
                           {project.labels.map((label) => (
                              <LabelChip
                                 key={label.id}
                                 label={label}
                                 onRemove={() => removeLabel(project, label)}
                              />
                           ))}
                           <AddLabelPopover project={project} />
                        </div>
                     </div>
                  </div>
               ))}
               {projects.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">{t('No projects')}</div>
               )}
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
