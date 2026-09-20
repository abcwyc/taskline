'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { formatRelativeTime } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Review, ReviewFileCategory } from '@/mock-data/reviews';
import { useMeStore } from '@/store/me-store';
import { useMembersStore } from '@/store/members-store';
import { useReviewsStore } from '@/store/reviews-store';
import { formatDistanceToNowStrict } from 'date-fns';
import {
   ChevronDown,
   ChevronRight,
   FileCode2,
   GitCommitHorizontal,
   Plus,
   Send,
   Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { DiffStat, InlineText, IssueCheckIcon, PrIcon } from './review-shared';

const CATEGORY_LABELS: Record<ReviewFileCategory, string> = {
   implementation: 'Implementation',
   tests: 'Tests',
};

function FilesPanel({ review }: { review: Review }) {
   const { t } = useLanguage();
   const categories = (['implementation', 'tests'] as ReviewFileCategory[])
      .map((category) => ({
         category,
         files: review.files.filter((file) => file.category === category),
      }))
      .filter((group) => group.files.length > 0);

   return (
      <div className="flex flex-col gap-2">
         <span className="text-sm font-medium">
            {review.files.length} {t('files changed')}
         </span>
         {categories.map((group) => {
            const additions = group.files.reduce((acc, file) => acc + file.additions, 0);
            const deletions = group.files.reduce((acc, file) => acc + file.deletions, 0);
            return (
               <div key={group.category} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                     <span className="font-medium text-foreground">
                        {t(CATEGORY_LABELS[group.category])}
                     </span>
                     {group.files.length}
                     <ChevronDown className="size-3" />
                     <span className="flex-1" />
                     <DiffStat additions={additions} deletions={deletions} />
                  </div>
                  {group.category === 'implementation' ? (
                     group.files.map((file) => (
                        <div key={file.name} className="flex items-center gap-1.5 text-xs pl-2">
                           <FileCode2 className="size-3.5 text-muted-foreground shrink-0" />
                           <span className="font-medium">{file.name}</span>
                           <span className="text-muted-foreground truncate">{file.path}</span>
                        </div>
                     ))
                  ) : (
                     <span className="text-xs text-muted-foreground pl-2">
                        {group.files.map((file) => file.name).join(', ')}
                     </span>
                  )}
               </div>
            );
         })}
      </div>
   );
}

/** Discussion under the overview: persisted comments + a composer. */
function ReviewComments({ review }: { review: Review }) {
   const { locale, t } = useLanguage();
   const addComment = useReviewsStore((s) => s.addComment);
   const deleteComment = useReviewsStore((s) => s.deleteComment);
   const getMemberById = useMembersStore((s) => s.getMemberById);
   const me = useMeStore((s) => s.me);
   const [draft, setDraft] = useState('');
   const [posting, setPosting] = useState(false);

   const comments = review.comments ?? [];

   const submit = async () => {
      const text = draft.trim();
      if (!text || posting) return;
      setPosting(true);
      const ok = await addComment(review.id, text);
      setPosting(false);
      if (ok) setDraft('');
   };

   const onKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
         event.preventDefault();
         void submit();
      }
   };

   return (
      <div className="flex flex-col gap-3">
         <h2 className="text-lg font-semibold">{t('Comments')}</h2>
         {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">
               {t('No comments yet — start the discussion.')}
            </p>
         )}
         <div className="flex flex-col gap-2.5">
            {comments.map((comment) => {
               const author = getMemberById(comment.authorId);
               const canDelete =
                  Boolean(me) && (me?.id === comment.authorId || me?.role === 'Admin');
               return (
                  <div
                     key={comment.id}
                     className="group flex items-start gap-2.5 rounded-lg border border-border/60 bg-container p-3"
                  >
                     <Avatar className="size-5 mt-0.5">
                        <AvatarImage
                           src={author?.avatarUrl}
                           alt={author?.name ?? comment.authorId}
                        />
                        <AvatarFallback>{(author?.name ?? comment.authorId)[0]}</AvatarFallback>
                     </Avatar>
                     <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                           <span className="text-sm font-medium">
                              {author?.name ?? comment.authorId}
                           </span>
                           <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(
                                 locale,
                                 formatDistanceToNowStrict(new Date(comment.createdAt), {
                                    addSuffix: true,
                                 })
                              )}
                           </span>
                           {comment.filePath && (
                              <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/60 px-1.5 py-px font-mono text-[11px] text-muted-foreground max-w-56">
                                 <FileCode2 className="size-3 shrink-0" />
                                 <span className="truncate">{comment.filePath}</span>
                              </span>
                           )}
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                           {comment.body}
                        </p>
                     </div>
                     {canDelete && (
                        <button
                           type="button"
                           aria-label={t('Delete comment')}
                           onClick={() => deleteComment(review.id, comment.id)}
                           className="mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-[color,opacity]"
                        >
                           <Trash2 className="size-3.5" />
                        </button>
                     )}
                  </div>
               );
            })}
         </div>
         <div className="flex flex-col gap-2 rounded-lg border p-3">
            <Textarea
               value={draft}
               onChange={(event) => setDraft(event.target.value)}
               onKeyDown={onKeyDown}
               placeholder={t('Leave a comment…')}
               rows={2}
               className="min-h-0 resize-none"
            />
            <div className="flex items-center justify-end gap-2">
               <span className="mr-auto text-xs text-muted-foreground">{t('⌘↵ to submit')}</span>
               <Button size="xs" onClick={() => void submit()} disabled={!draft.trim() || posting}>
                  <Send className="size-3.5" />
                  {t('Comment')}
               </Button>
            </div>
         </div>
      </div>
   );
}

/** Overview tab: description + timeline on the left, properties on the right. */
export function ReviewOverview({ review }: { review: Review }) {
   const { locale, t } = useLanguage();
   const { orgId } = useParams<{ orgId: string }>();

   return (
      <div className="h-full flex overflow-hidden">
         <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-8 flex flex-col gap-6">
               <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-semibold leading-snug">{review.title}</h1>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono flex-wrap">
                     <PrIcon status={review.status} className="size-3.5" />
                     <span>
                        {review.repo}#{review.prNumber}
                     </span>
                     <span>·</span>
                     <span>
                        {review.targetBranch} ← {review.sourceBranch}
                     </span>
                  </div>
               </div>

               <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1 text-sm font-medium">
                     {t('Description')}
                     <ChevronDown className="size-3.5 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold">{t('Summary')}</h2>
                  <ul className="flex flex-col gap-2 list-disc pl-5 text-sm leading-relaxed">
                     {review.summary.map((bullet, index) => (
                        <li key={index}>
                           <InlineText text={bullet} />
                        </li>
                     ))}
                  </ul>
               </div>

               <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold">{t('Ticket')}</h2>
                  <Link
                     href={`/${orgId}/issue/${review.resolves.identifier}`}
                     className="inline-flex items-center gap-2 rounded-md bg-muted/60 border border-border/60 px-2 py-1.5 text-sm hover:bg-muted transition-colors self-start"
                  >
                     <IssueCheckIcon />
                     <span className="font-medium">{review.resolves.identifier}</span>
                     <span className="text-muted-foreground truncate">{review.resolves.title}</span>
                  </Link>
               </div>

               <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold">{t('Test plan')}</h2>
                  <div className="flex flex-col gap-1.5">
                     {review.testPlan.map((item, index) => (
                        <label key={index} className="flex items-start gap-2 text-sm">
                           <Checkbox checked={item.checked} className="size-4 mt-0.5" />
                           <span>
                              <InlineText text={item.text} />
                           </span>
                        </label>
                     ))}
                  </div>
               </div>

               {review.deployment && (
                  <div className="rounded-lg border overflow-hidden text-sm">
                     <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b bg-sidebar/50 text-xs text-muted-foreground">
                        <span>{t('Project')}</span>
                        <span>{t('Deployment')}</span>
                        <span>{t('Actions')}</span>
                     </div>
                     <div className="grid grid-cols-3 gap-2 px-3 py-2 items-center">
                        <span className="font-medium">{review.deployment.project}</span>
                        <span className="inline-flex items-center gap-1.5">
                           <span
                              className={cn(
                                 'size-2 rounded-full',
                                 review.deployment.state === 'Ready'
                                    ? 'bg-emerald-500'
                                    : 'bg-muted-foreground/50'
                              )}
                           />
                           {t(review.deployment.state)}
                        </span>
                        <button className="text-primary text-left hover:underline">
                           {t(review.deployment.action)}
                        </button>
                     </div>
                  </div>
               )}

               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GitCommitHorizontal className="size-3.5 shrink-0" />
                  <span className="truncate">
                     {t('Atlas committed via LNDev Agent')}{' '}
                     <span className="font-mono">{review.commits.at(-1)?.sha}</span>{' '}
                     {review.commits.at(-1)?.message} ({review.resolves.identifier}) ·{' '}
                     {formatRelativeTime(locale, review.commits.at(-1)?.timeAgo ?? '')}
                  </span>
               </div>

               {review.reviewNote && (
                  <div className="rounded-lg border p-4 flex flex-col gap-3">
                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="size-5 rounded-full bg-muted inline-block" />
                        <span className="font-medium text-foreground">
                           {review.reviewNote.author}
                        </span>
                        {formatRelativeTime(locale, review.reviewNote.timeAgo)}
                     </div>
                     <h3 className="text-base font-semibold">{t('Review results')}</h3>
                     <blockquote className="border-l-2 border-emerald-500 pl-3 text-sm leading-relaxed">
                        {review.reviewNote.verdictLine}
                     </blockquote>
                     <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.reviewNote.profileLine}
                     </p>
                     <div className="rounded-md border overflow-hidden text-sm">
                        <div className="grid grid-cols-5 gap-2 px-3 py-1.5 border-b bg-sidebar/50 text-xs text-muted-foreground">
                           <span>{t('Review')}</span>
                           <span>{t('Verdict')}</span>
                           <span>{t('Critical')}</span>
                           <span>{t('High')}</span>
                           <span>{t('Medium')}</span>
                        </div>
                        {review.reviewNote.rows.map((row) => (
                           <div
                              key={row.review}
                              className="grid grid-cols-5 gap-2 px-3 py-2 border-b last:border-b-0 text-xs items-start"
                           >
                              <span className="font-medium">{t(row.review)}</span>
                              <span>{row.verdict}</span>
                              <span>{row.critical}</span>
                              <span>{row.high}</span>
                              <span>{row.medium}</span>
                           </div>
                        ))}
                     </div>
                     {review.reviewNote.footer && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                           {review.reviewNote.footer}
                        </p>
                     )}
                  </div>
               )}

               <ReviewComments review={review} />
            </div>
         </div>

         <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l h-full overflow-y-auto p-5 gap-6">
            <div className="flex flex-col gap-2">
               <span className="text-sm font-medium">{t('Status')}</span>
               <span className="inline-flex items-center gap-1.5 text-sm">
                  <PrIcon status={review.status} />
                  {review.status === 'merged'
                     ? t('Merged')
                     : review.status === 'closed'
                       ? t('Closed')
                       : t('Open')}
               </span>
            </div>
            <div className="flex flex-col gap-2">
               <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('Resolves')}</span>
                  <Plus className="size-3.5 text-muted-foreground" />
               </div>
               <Link
                  href={`/${orgId}/issue/${review.resolves.identifier}`}
                  className="flex items-center gap-1.5 text-sm hover:opacity-80 min-w-0"
               >
                  <IssueCheckIcon />
                  <span className="truncate">{review.resolves.title}</span>
               </Link>
            </div>
            <div className="flex flex-col gap-2">
               <span className="text-sm font-medium">{t('Reviewers')}</span>
               <span className="text-xs text-muted-foreground">
                  {t('All workspace members can review.')}
               </span>
            </div>
            <div className="flex flex-col gap-2">
               <span className="text-sm font-medium">{t('Checks')}</span>
               <span className="inline-flex items-center gap-1.5 text-sm">
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                  {review.checksPassed} / {review.checksTotal} {t('passed')}
               </span>
               <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="size-3.5 rounded-full border-2 border-muted-foreground/50 inline-block" />
                  gate
               </span>
            </div>
            <FilesPanel review={review} />
         </aside>
      </div>
   );
}
