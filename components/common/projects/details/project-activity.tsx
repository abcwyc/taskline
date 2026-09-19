'use client';

import { ContentBlocks } from '@/components/common/issues/details/content-blocks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
   AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
   ProjectUpdate,
   ProjectUpdateHealth,
   projectUpdateHealthColor,
   projectUpdateHealthLabel,
} from '@/mock-data/project-details';
import { useIssuesStore } from '@/store/issues-store';
import { useProjectsStore } from '@/store/projects-store';
import { useProjectDetail, useProjectDetailsStore } from '@/store/project-details-store';
import { format, parseISO } from 'date-fns';
import { Paperclip, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProjectSidePanel } from './project-side-panel';
import { useLanguage } from '@/components/providers/language-provider';
import { formatProjectDate, projectPriorityLabel } from '@/lib/project-localization';
import type { AppLocale } from '@/lib/i18n';

interface ProjectActivityProps {
   projectId: string;
}

const updateHealthLabel = (locale: AppLocale, health: ProjectUpdateHealth) => {
   if (locale === 'en') return projectUpdateHealthLabel[health];
   return { 'on-track': '进展顺利', 'at-risk': '存在风险', 'off-track': '偏离计划' }[health];
};

function HealthBadge({ health }: { health: ProjectUpdateHealth }) {
   const { locale } = useLanguage();
   return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-2 py-0.5">
         <span
            className="size-2 rounded-full"
            style={{ backgroundColor: projectUpdateHealthColor[health] }}
         />
         {updateHealthLabel(locale, health)}
      </span>
   );
}

function UpdateCard({ update, projectId }: { update: ProjectUpdate; projectId: string }) {
   const { locale, t } = useLanguage();
   const deleteUpdate = useProjectDetailsStore((s) => s.deleteUpdate);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);

   return (
      <div className="group relative border rounded-lg p-4">
         <div className="flex items-center gap-2 text-sm">
            <Avatar className="size-5">
               <AvatarImage src={update.author.avatarUrl} alt={update.author.name} />
               <AvatarFallback>{update.author.name[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{update.author.name}</span>
            <span className="text-xs text-muted-foreground">
               {formatProjectDate(locale, update.date)}
            </span>
            <span className="ml-auto flex items-center gap-1.5">
               <HealthBadge health={update.health} />
               <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                     <AlertDialogTrigger asChild>
                        <button
                           className="text-muted-foreground hover:text-destructive transition-colors"
                           aria-label={t('Delete update')}
                           title={t('Delete update')}
                        >
                           <Trash2 className="size-3.5" />
                        </button>
                     </AlertDialogTrigger>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                           <AlertDialogTitle>{t('Delete update')}</AlertDialogTitle>
                           <AlertDialogDescription>
                              {t(
                                 'This update will be permanently removed from the project. This action cannot be undone.'
                              )}
                           </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                           <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                           <AlertDialogAction
                              className="bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => deleteUpdate(projectId, update.id)}
                           >
                              {t('Delete')}
                           </AlertDialogAction>
                        </AlertDialogFooter>
                     </AlertDialogContent>
                  </AlertDialog>
               </span>
            </span>
         </div>
         <div className="mt-2 text-sm leading-relaxed">
            <ContentBlocks blocks={update.blocks} />
         </div>
      </div>
   );
}

/** Project "Activity" tab: update composer + monthly timeline. */
export default function ProjectActivity({ projectId }: ProjectActivityProps) {
   const { locale, t } = useLanguage();
   const project = useProjectsStore((s) => s.getProjectById(projectId));
   const detail = useProjectDetail(projectId);
   const { issues: allIssues } = useIssuesStore();
   const issues = useMemo(
      () => allIssues.filter((issue) => issue.project?.id === projectId),
      [allIssues, projectId]
   );
   const postUpdate = useProjectDetailsStore((s) => s.postUpdate);
   const [mode, setMode] = useState<'comment' | 'update'>('update');
   const [health, setHealth] = useState<ProjectUpdateHealth>('on-track');
   const [text, setText] = useState('');

   const updates = useMemo<ProjectUpdate[]>(() => detail.updates, [detail.updates]);

   const updatesByMonth = useMemo(() => {
      const groups = new Map<string, ProjectUpdate[]>();
      for (const update of updates) {
         const month =
            locale === 'zh-CN'
               ? `${parseISO(update.date).getMonth() + 1}月`
               : format(parseISO(update.date), 'MMMM');
         groups.set(month, [...(groups.get(month) ?? []), update]);
      }
      return [...groups.entries()];
   }, [updates, locale]);

   const completedPercent =
      issues.length > 0
         ? Math.round(
              (issues.filter((issue) => issue.status.category === 'completed').length /
                 issues.length) *
                 100
           )
         : 0;

   const handlePost = () => {
      if (text.trim() === '' || !project) return;
      postUpdate(project.id, health, text);
      setText('');
   };

   if (!project) {
      return <div className="p-10 text-sm text-muted-foreground">{t('Loading project…')}</div>;
   }

   return (
      <div className="w-full h-full flex overflow-hidden">
         <div className="flex-1 min-w-0 h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 lg:px-10 py-8">
               {/* Composer */}
               <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                     <div className="flex items-center rounded-md border p-0.5 text-xs">
                        {(['comment', 'update'] as const).map((value) => (
                           <button
                              key={value}
                              type="button"
                              onClick={() => setMode(value)}
                              className={cn(
                                 'px-2 py-1 rounded-[5px] capitalize transition-colors',
                                 mode === value
                                    ? 'bg-accent text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                              )}
                           >
                              {value === 'comment' ? t('Comment') : t('Update')}
                           </button>
                        ))}
                     </div>
                     {mode === 'update' && (
                        <DropdownMenu>
                           <DropdownMenuTrigger className="outline-none">
                              <HealthBadge health={health} />
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="start" className="w-40">
                              {(Object.keys(projectUpdateHealthLabel) as ProjectUpdateHealth[]).map(
                                 (value) => (
                                    <DropdownMenuItem key={value} onClick={() => setHealth(value)}>
                                       <span
                                          className="size-2 rounded-full"
                                          style={{
                                             backgroundColor: projectUpdateHealthColor[value],
                                          }}
                                       />
                                       {updateHealthLabel(locale, value)}
                                    </DropdownMenuItem>
                                 )
                              )}
                           </DropdownMenuContent>
                        </DropdownMenu>
                     )}
                  </div>

                  <textarea
                     value={text}
                     onChange={(event) => setText(event.target.value)}
                     placeholder={
                        mode === 'update' ? t('Write a project update…') : t('Leave a comment…')
                     }
                     className="mt-3 w-full min-h-24 resize-y bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />

                  {mode === 'update' && (
                     <div className="mt-1 border-l-2 pl-4 py-1 flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <div className="flex gap-6">
                           <span className="w-20">{t('Priority')}</span>
                           <span>
                              {t('No priority')} →{' '}
                              <span className="text-foreground">
                                 {projectPriorityLabel(
                                    locale,
                                    project.priority.id,
                                    project.priority.name
                                 )}
                              </span>
                           </span>
                        </div>
                        <div className="flex gap-6">
                           <span className="w-20">{t('Lead')}</span>
                           <span>
                              {locale === 'zh-CN' && '已指派 '}
                              <span className="text-foreground">{project.lead.name}</span>
                              {locale === 'en' && ' assigned'}
                           </span>
                        </div>
                        <div className="flex gap-6">
                           <span className="w-20">{t('Target date')}</span>
                           <span>
                              {t('set to')}{' '}
                              <span className="text-foreground">
                                 {project.targetDate
                                    ? formatProjectDate(locale, project.targetDate)
                                    : '—'}
                              </span>
                           </span>
                        </div>
                        <div className="flex gap-6">
                           <span className="w-20">{t('Progress')}</span>
                           <span>
                              0% → <span className="text-foreground">{completedPercent}%</span>
                           </span>
                        </div>
                     </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                     <Button variant="outline" size="xs" className="gap-1.5">
                        <Sparkles className="size-3.5" />
                        {t('Write with Agent')}
                     </Button>
                     <div className="flex items-center gap-2">
                        <Button
                           variant="ghost"
                           size="icon"
                           className="size-7 text-muted-foreground"
                        >
                           <Paperclip className="size-4" />
                        </Button>
                        <Button size="xs" onClick={handlePost} disabled={text.trim() === ''}>
                           {mode === 'update' ? t('Post update') : t('Post comment')}
                        </Button>
                     </div>
                  </div>
               </div>

               {/* Timeline */}
               {updatesByMonth.length === 0 ? (
                  <p className="mt-10 text-sm text-muted-foreground text-center">
                     {t('No updates yet — post the first one to keep the team in the loop.')}
                  </p>
               ) : (
                  updatesByMonth.map(([month, monthUpdates]) => (
                     <div key={month} className="mt-8">
                        <h3 className="text-lg font-semibold mb-3">{month}</h3>
                        <div className="flex flex-col gap-3">
                           {monthUpdates.map((update) => (
                              <UpdateCard key={update.id} update={update} projectId={projectId} />
                           ))}
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>

         <ProjectSidePanel project={project} detail={detail} issues={issues} />
      </div>
   );
}
