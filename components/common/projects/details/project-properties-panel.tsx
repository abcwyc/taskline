'use client';

import { CapacityRing } from '@/components/common/cycles/capacity-ring';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogClose,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Issue } from '@/mock-data/issues';
import { useCyclesStore } from '@/store/cycles-store';
import { ProjectDetail, ProjectMilestone } from '@/mock-data/project-details';
import { Project } from '@/mock-data/projects';
import { useProjectDetailsStore } from '@/store/project-details-store';
import { useTeamsStore } from '@/store/teams-store';
import { PanelFilterTarget, usePanelFilter } from '@/components/common/issues/use-panel-filter';
import { cn } from '@/lib/utils';
import { ProjectProgressChart } from './project-progress-chart';
import {
   ArrowRight,
   Calendar,
   Check,
   Compass,
   Pencil,
   Plus,
   Tag,
   Trash2,
   UserPlus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLanguage } from '@/components/providers/language-provider';
import {
   formatProjectDate,
   projectPriorityLabel,
   projectStatusLabel,
} from '@/lib/project-localization';

interface ProjectPropertiesPanelProps {
   project: Project;
   detail: ProjectDetail;
   issues: Issue[];
}

const isCompleted = (issue: Issue) => issue.status.category === 'completed';

interface BreakdownRow {
   key: string;
   label: string;
   leading: React.ReactNode;
   total: number;
   completedPercent: number;
   /** Click-to-filter target (exclusive, like the insights panel rows). */
   target?: PanelFilterTarget;
}

function buildRows<T>(
   issues: Issue[],
   keyOf: (issue: Issue) => T | undefined,
   describe: (key: T, sample: Issue) => Omit<BreakdownRow, 'total' | 'completedPercent'>
): BreakdownRow[] {
   const buckets = new Map<T, Issue[]>();
   for (const issue of issues) {
      const key = keyOf(issue);
      if (key === undefined) continue;
      buckets.set(key, [...(buckets.get(key) ?? []), issue]);
   }
   return [...buckets.entries()]
      .map(([key, bucket]) => ({
         ...describe(key, bucket[0]),
         total: bucket.length,
         completedPercent: Math.round((bucket.filter(isCompleted).length / bucket.length) * 100),
      }))
      .sort((a, b) => b.total - a.total);
}

function BreakdownList({
   rows,
   panelFilter,
}: {
   rows: BreakdownRow[];
   panelFilter: ReturnType<typeof usePanelFilter>;
}) {
   const { locale, t } = useLanguage();
   if (rows.length === 0) {
      return <p className="text-xs text-muted-foreground px-1 py-3">{t('Nothing to show yet.')}</p>;
   }
   return (
      <div className="flex flex-col">
         {rows.map((row) => {
            const active = row.target ? panelFilter.isActive(row.target) : false;
            return (
               <button
                  key={row.key}
                  type="button"
                  onClick={() => row.target && panelFilter.toggle(row.target)}
                  className={cn(
                     'flex items-center justify-between gap-3 py-2 px-1.5 -mx-1.5 rounded-md text-left transition-colors',
                     row.target && 'cursor-pointer hover:bg-accent/50',
                     active && 'bg-accent hover:bg-accent'
                  )}
               >
                  <div className="flex items-center gap-2 min-w-0">
                     {row.leading}
                     <span className="text-sm truncate">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-sm text-muted-foreground">
                     <CapacityRing value={row.completedPercent} color="#6771c5" />
                     <span className="whitespace-nowrap">
                        {locale === 'zh-CN'
                           ? `${row.total} 项中已完成 ${row.completedPercent}%`
                           : `${row.completedPercent}% of ${row.total}`}
                     </span>
                  </div>
               </button>
            );
         })}
      </div>
   );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
   return (
      <div className="flex items-center justify-between gap-4 min-h-7">
         <span className="text-sm text-muted-foreground shrink-0">{label}</span>
         <div className="flex items-center gap-1.5 text-sm min-w-0">{children}</div>
      </div>
   );
}

/**
 * Right-side panel of the project pages: properties, milestones,
 * progress breakdowns and a compact activity feed.
 */
export function ProjectPropertiesPanel({ project, detail, issues }: ProjectPropertiesPanelProps) {
   const { locale, t } = useLanguage();
   const { orgId } = useParams<{ orgId: string }>();
   const formatDay = (iso?: string) => formatProjectDate(locale, iso);
   const teams = useTeamsStore((s) => s.teams);
   const cycles = useCyclesStore((s) => s.cycles);
   const panelFilter = usePanelFilter();
   const toggleMilestone = useProjectDetailsStore((s) => s.toggleMilestone);
   const addMilestone = useProjectDetailsStore((s) => s.addMilestone);
   const renameMilestone = useProjectDetailsStore((s) => s.renameMilestone);
   const setMilestoneDate = useProjectDetailsStore((s) => s.setMilestoneDate);
   const removeMilestone = useProjectDetailsStore((s) => s.removeMilestone);
   const completed = issues.filter(isCompleted).length;

   // Milestone editing state
   const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
   const [newMilestoneName, setNewMilestoneName] = useState('');
   const [newMilestoneDate, setNewMilestoneDate] = useState('');
   const [renamingMilestoneId, setRenamingMilestoneId] = useState<string | null>(null);
   const [renameValue, setRenameValue] = useState('');
   const [editingDateMilestoneId, setEditingDateMilestoneId] = useState<string | null>(null);
   const [milestoneToDelete, setMilestoneToDelete] = useState<ProjectMilestone | null>(null);

   const openAddMilestoneDialog = () => {
      setNewMilestoneName('');
      setNewMilestoneDate('');
      setIsAddMilestoneOpen(true);
   };

   const handleAddMilestone = () => {
      const name = newMilestoneName.trim();
      if (!name) return;
      addMilestone(project.id, name, newMilestoneDate || null);
      setIsAddMilestoneOpen(false);
      setNewMilestoneName('');
      setNewMilestoneDate('');
   };

   const startRenameMilestone = (milestone: ProjectMilestone) => {
      setRenamingMilestoneId(milestone.id);
      setRenameValue(milestone.name);
   };

   const commitRenameMilestone = (milestone: ProjectMilestone) => {
      if (renamingMilestoneId !== milestone.id) return;
      const name = renameValue.trim();
      if (name && name !== milestone.name) {
         renameMilestone(project.id, milestone.id, name);
      }
      setRenamingMilestoneId(null);
   };

   const team = teams.find((candidate) => candidate.id === project.teamId);

   const started = issues.filter((issue) => issue.status.category === 'started').length;

   const members = useMemo(() => {
      const seen = new Set<string>();
      return issues
         .map((issue) => issue.assignee)
         .filter((assignee): assignee is NonNullable<typeof assignee> => {
            if (!assignee || seen.has(assignee.id)) return false;
            seen.add(assignee.id);
            return true;
         });
   }, [issues]);

   const assigneeRows = useMemo(
      () =>
         buildRows(
            issues,
            (issue) => issue.assignee?.id ?? 'no-assignee',
            (key, sample) =>
               sample.assignee
                  ? {
                       key: String(key),
                       label: sample.assignee.name,
                       leading: (
                          <Avatar className="size-5 shrink-0">
                             <AvatarImage
                                src={sample.assignee.avatarUrl}
                                alt={sample.assignee.name}
                             />
                             <AvatarFallback>{sample.assignee.name[0]}</AvatarFallback>
                          </Avatar>
                       ),
                       target: { columnId: 'assignee', value: sample.assignee.id },
                    }
                  : {
                       key: 'no-assignee',
                       label: t('No assignee'),
                       leading: null,
                       target: { columnId: 'assignee', value: 'unassigned' },
                    }
         ),
      [issues, t]
   );

   const labelRows = useMemo(
      () =>
         buildRows(
            issues,
            (issue) => issue.labels[0]?.id,
            (key, sample) => ({
               key: String(key),
               label: sample.labels[0]?.name ?? t('Unlabeled'),
               leading: (
                  <span
                     className="size-2.5 rounded-full shrink-0"
                     style={{ backgroundColor: sample.labels[0]?.color ?? 'gray' }}
                  />
               ),
               target: { columnId: 'labels', value: String(key) },
            })
         ),
      [issues, t]
   );

   const cycleRows = useMemo(
      () =>
         buildRows(
            issues,
            (issue) => (issue.cycleId === '' ? undefined : issue.cycleId),
            (key) => ({
               key: String(key),
               label: cycles.find((c) => c.id === String(key))?.name ?? `${t('Cycle')} ${key}`,
               leading: null,
               target: { columnId: 'cycle', value: String(key) },
            })
         ),
      [issues, cycles, t]
   );

   return (
      <div className="flex flex-col h-full w-full overflow-y-auto">
         {/* Properties */}
         <div className="px-5 pt-4 pb-4 border-b">
            <h3 className="text-sm font-medium mb-2.5">{t('Properties')}</h3>
            <div className="flex flex-col gap-1">
               <PropertyRow label={t('Status')}>
                  <project.status.icon />
                  <span>{projectStatusLabel(locale, project.status.id, project.status.name)}</span>
               </PropertyRow>
               <PropertyRow label={t('Priority')}>
                  <project.priority.icon className="size-3.5 text-muted-foreground" />
                  <span>
                     {projectPriorityLabel(locale, project.priority.id, project.priority.name)}
                  </span>
               </PropertyRow>
               <PropertyRow label={t('Lead')}>
                  <Avatar className="size-5">
                     <AvatarImage src={project.lead.avatarUrl} alt={project.lead.name} />
                     <AvatarFallback>{project.lead.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-36">{project.lead.name}</span>
               </PropertyRow>
               <PropertyRow label={t('Members')}>
                  {members.length > 0 ? (
                     <span className="inline-flex items-center gap-1.5">
                        <span className="flex -space-x-1.5">
                           {members.slice(0, 3).map((member) => (
                              <Avatar key={member.id} className="size-5 border-2 border-container">
                                 <AvatarImage src={member.avatarUrl} alt={member.name} />
                                 <AvatarFallback>{member.name[0]}</AvatarFallback>
                              </Avatar>
                           ))}
                        </span>
                        {locale === 'zh-CN'
                           ? `${members.length} 位成员`
                           : `${members.length} ${members.length === 1 ? 'member' : 'members'}`}
                     </span>
                  ) : (
                     <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                        <UserPlus className="size-3.5" />
                        {t('Add members')}
                     </button>
                  )}
               </PropertyRow>
               <PropertyRow label={t('Dates')}>
                  <span className="inline-flex items-center gap-1">
                     <Calendar className="size-3.5 text-muted-foreground" />
                     {formatDay(project.startDate)}
                  </span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="inline-flex items-center gap-1">
                     <Calendar className="size-3.5 text-muted-foreground" />
                     {project.targetDate ? formatDay(project.targetDate) : t('Target')}
                  </span>
               </PropertyRow>
               <PropertyRow label={t('Teams')}>
                  <span className="inline-flex items-center gap-1.5">
                     {team?.icon} {team?.name ?? project.teamId}
                  </span>
               </PropertyRow>
               <PropertyRow label={t('Initiatives')}>
                  {project.initiative ? (
                     <span className="truncate max-w-44">{project.initiative}</span>
                  ) : (
                     <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Compass className="size-3.5" />
                        {t('No initiative')}
                     </span>
                  )}
               </PropertyRow>
               <PropertyRow label={t('Labels')}>
                  <div className="flex items-center gap-1.5">
                     {project.labels.length === 0 && (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                           <Tag className="size-3.5" />
                           {t('Add label')}
                        </span>
                     )}
                     {project.labels.map((label) => (
                        <span
                           key={label.id}
                           className="inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5"
                        >
                           <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: label.color }}
                           />
                           {label.name}
                        </span>
                     ))}
                     <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Plus className="size-3.5" />
                     </button>
                  </div>
               </PropertyRow>
            </div>
         </div>

         {/* Milestones */}
         <div className="px-5 py-4 border-b">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-sm font-medium">{t('Milestones')}</h3>
               <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={openAddMilestoneDialog}
                  aria-label={t('Add milestone')}
                  title={t('Add milestone')}
               >
                  <Plus className="size-3.5" />
               </button>
            </div>
            {detail.milestones.length === 0 ? (
               <p className="text-xs text-muted-foreground">
                  {t(
                     'Add milestones to organize work within your project and break it into more granular stages.'
                  )}{' '}
                  <span className="text-foreground/70 underline">{t('Learn more')}</span>
               </p>
            ) : (
               <div className="flex flex-col gap-1.5">
                  {detail.milestones.map((milestone) => (
                     <div
                        key={milestone.id}
                        className="group flex items-center justify-between gap-2 text-sm"
                     >
                        <span className="flex items-center gap-2 min-w-0">
                           <button
                              type="button"
                              onClick={() =>
                                 toggleMilestone(project.id, milestone.id, !milestone.completed)
                              }
                              className={cn(
                                 'size-4 rounded-full shrink-0 transition-colors',
                                 milestone.completed
                                    ? 'bg-violet-500 flex items-center justify-center'
                                    : 'border border-muted-foreground/40 hover:border-violet-500'
                              )}
                              aria-label={
                                 milestone.completed
                                    ? t('Mark milestone as not done')
                                    : t('Mark milestone as done')
                              }
                           >
                              {milestone.completed && <Check className="size-2.5 text-white" />}
                           </button>
                           {renamingMilestoneId === milestone.id ? (
                              <Input
                                 autoFocus
                                 value={renameValue}
                                 onChange={(event) => setRenameValue(event.target.value)}
                                 onFocus={(event) => event.target.select()}
                                 onKeyDown={(event) => {
                                    if (event.key === 'Enter') commitRenameMilestone(milestone);
                                    if (event.key === 'Escape') setRenamingMilestoneId(null);
                                 }}
                                 onBlur={() => commitRenameMilestone(milestone)}
                                 className="h-6 px-1.5 text-sm"
                              />
                           ) : (
                              <span
                                 className={cn(
                                    'truncate',
                                    milestone.completed && 'line-through text-muted-foreground'
                                 )}
                              >
                                 {milestone.name}
                              </span>
                           )}
                        </span>

                        <span className="flex items-center gap-1.5 shrink-0">
                           {editingDateMilestoneId === milestone.id ? (
                              <input
                                 type="date"
                                 autoFocus
                                 defaultValue={milestone.targetDate ?? ''}
                                 onChange={(event) => {
                                    setMilestoneDate(
                                       project.id,
                                       milestone.id,
                                       event.target.value || null
                                    );
                                    setEditingDateMilestoneId(null);
                                 }}
                                 onBlur={() => setEditingDateMilestoneId(null)}
                                 onKeyDown={(event) => {
                                    if (event.key === 'Escape') setEditingDateMilestoneId(null);
                                 }}
                                 className="h-6 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring"
                                 aria-label={t('Milestone target date')}
                              />
                           ) : (
                              <span className="text-xs text-muted-foreground whitespace-nowrap group-hover:hidden">
                                 {formatDay(milestone.targetDate)}
                              </span>
                           )}

                           <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                 className="text-muted-foreground hover:text-foreground transition-colors"
                                 onClick={() => startRenameMilestone(milestone)}
                                 aria-label={t('Rename milestone')}
                                 title={t('Rename')}
                              >
                                 <Pencil className="size-3.5" />
                              </button>
                              <button
                                 className="text-muted-foreground hover:text-foreground transition-colors"
                                 onClick={() => setEditingDateMilestoneId(milestone.id)}
                                 aria-label={t('Edit milestone date')}
                                 title={t('Edit date')}
                              >
                                 <Calendar className="size-3.5" />
                              </button>
                              <button
                                 className="text-muted-foreground hover:text-destructive transition-colors"
                                 onClick={() => setMilestoneToDelete(milestone)}
                                 aria-label={t('Delete milestone')}
                                 title={t('Delete')}
                              >
                                 <Trash2 className="size-3.5" />
                              </button>
                           </span>
                        </span>
                     </div>
                  ))}
               </div>
            )}

            {/* Add milestone dialog */}
            <Dialog open={isAddMilestoneOpen} onOpenChange={setIsAddMilestoneOpen}>
               <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                     <DialogTitle>{t('Add milestone')}</DialogTitle>
                     <DialogDescription>
                        {t('Break the project into smaller, trackable stages.')}
                     </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-3">
                     <Input
                        autoFocus
                        value={newMilestoneName}
                        onChange={(event) => setNewMilestoneName(event.target.value)}
                        onKeyDown={(event) => {
                           if (event.key === 'Enter') handleAddMilestone();
                        }}
                        placeholder={t('Milestone name')}
                     />
                     <Input
                        type="date"
                        value={newMilestoneDate}
                        onChange={(event) => setNewMilestoneDate(event.target.value)}
                        aria-label={t('Target date')}
                     />
                  </div>
                  <DialogFooter>
                     <DialogClose asChild>
                        <Button variant="outline" size="xs">
                           {t('Cancel')}
                        </Button>
                     </DialogClose>
                     <Button
                        size="xs"
                        onClick={handleAddMilestone}
                        disabled={!newMilestoneName.trim()}
                     >
                        {t('Add milestone')}
                     </Button>
                  </DialogFooter>
               </DialogContent>
            </Dialog>

            {/* Delete milestone confirmation */}
            <AlertDialog
               open={milestoneToDelete !== null}
               onOpenChange={(open) => {
                  if (!open) setMilestoneToDelete(null);
               }}
            >
               <AlertDialogContent>
                  <AlertDialogHeader>
                     <AlertDialogTitle>{t('Delete milestone')}</AlertDialogTitle>
                     <AlertDialogDescription>
                        {t(
                           'This milestone will be permanently removed from the project. This action cannot be undone.'
                        )}
                     </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                     <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                     <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => {
                           if (milestoneToDelete) {
                              removeMilestone(project.id, milestoneToDelete.id);
                           }
                           setMilestoneToDelete(null);
                        }}
                     >
                        {t('Delete')}
                     </AlertDialogAction>
                  </AlertDialogFooter>
               </AlertDialogContent>
            </AlertDialog>
         </div>

         {/* Progress */}
         <div className="px-5 py-4 border-b">
            <h3 className="text-sm font-medium mb-3">{t('Progress')}</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
               <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                     <span className="size-2 rounded-[2px] bg-[#8f9299]" />
                     {t('Scope')}
                  </div>
                  <span className="text-sm font-medium">{issues.length}</span>
               </div>
               <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                     <span className="size-2 rounded-[2px] bg-[#facc15]" />
                     {t('Started')}
                  </div>
                  <span className="text-sm font-medium">{started}</span>
               </div>
               <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                     <span className="size-2 rounded-[2px] bg-[#6771c5]" />
                     {t('Completed')}
                  </div>
                  <span className="text-sm font-medium">{completed}</span>
               </div>
            </div>
            <div className="mb-3">
               <ProjectProgressChart
                  startDate={project.startDate}
                  endDate={project.targetDate ?? project.startDate}
                  scope={issues.length}
                  started={started}
                  completed={completed}
               />
            </div>
            <Tabs defaultValue="assignees">
               <TabsList className="h-8 bg-transparent gap-1 p-0">
                  <TabsTrigger value="assignees" className="text-xs px-2.5 rounded-full">
                     {t('Assignees')}
                  </TabsTrigger>
                  <TabsTrigger value="labels" className="text-xs px-2.5 rounded-full">
                     {t('Labels')}
                  </TabsTrigger>
                  <TabsTrigger value="cycles" className="text-xs px-2.5 rounded-full">
                     {t('Cycles')}
                  </TabsTrigger>
               </TabsList>
               <TabsContent value="assignees">
                  <BreakdownList rows={assigneeRows} panelFilter={panelFilter} />
               </TabsContent>
               <TabsContent value="labels">
                  <BreakdownList rows={labelRows} panelFilter={panelFilter} />
               </TabsContent>
               <TabsContent value="cycles">
                  <BreakdownList rows={cycleRows} panelFilter={panelFilter} />
               </TabsContent>
            </Tabs>
         </div>

         {/* Activity */}
         <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-sm font-medium">{t('Activity')}</h3>
               <Link
                  href={`/${orgId}/project/${project.id}/activity`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
               >
                  {t('See all')}
               </Link>
            </div>
            <div className="flex flex-col gap-3">
               {detail.activity.map((event) => (
                  <div key={event.id} className="flex items-start gap-2 text-xs">
                     <Avatar className="size-4 mt-0.5 shrink-0">
                        <AvatarImage src={event.user.avatarUrl} alt={event.user.name} />
                        <AvatarFallback>{event.user.name[0]}</AvatarFallback>
                     </Avatar>
                     <p className="text-muted-foreground leading-relaxed">
                        <span className="text-foreground">{event.user.name}</span> {event.text} ·{' '}
                        {formatDay(event.date)}
                     </p>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
}
