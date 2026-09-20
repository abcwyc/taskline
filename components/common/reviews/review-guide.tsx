'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Review } from '@/mock-data/reviews';
import { useMembersStore } from '@/store/members-store';
import { Check, X } from 'lucide-react';
import { DiffStat, InlineText, PrIcon } from './review-shared';

/** Guide tab: the author's summary, test plan and the current verdict. */
export function ReviewGuide({ review }: { review: Review }) {
   const { t } = useLanguage();
   const getMemberById = useMembersStore((s) => s.getMemberById);
   const verdictBy =
      review.verdict && review.verdictById ? getMemberById(review.verdictById) : undefined;
   const hasContent = review.summary.length > 0 || review.testPlan.length > 0;

   return (
      <div className="h-full overflow-y-auto relative">
         <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-10">
            <div className="flex flex-col gap-1.5">
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

            {!hasContent && (
               <div className="rounded-lg border border-dashed px-6 py-8 text-sm text-muted-foreground">
                  {t('The author did not add a summary or test plan.')}
               </div>
            )}

            {review.summary.length > 0 && (
               <section className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">{t('Summary')}</h2>
                  <ul className="flex flex-col gap-2 list-disc pl-5 text-sm leading-relaxed">
                     {review.summary.map((bullet, index) => (
                        <li key={index}>
                           <InlineText text={bullet} />
                        </li>
                     ))}
                  </ul>
               </section>
            )}

            {review.testPlan.length > 0 && (
               <section className="flex flex-col gap-3">
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
               </section>
            )}

            <section className="flex flex-col gap-3">
               <h2 className="text-lg font-semibold">{t('Verdict')}</h2>
               {review.verdict ? (
                  <div className="rounded-lg border p-4 flex items-center gap-2.5 flex-wrap">
                     <span
                        className={cn(
                           'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                           review.verdict === 'approved'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        )}
                     >
                        {review.verdict === 'approved' ? (
                           <Check className="size-3.5" />
                        ) : (
                           <X className="size-3.5" />
                        )}
                        {review.verdict === 'approved' ? t('Approved') : t('Changes requested')}
                     </span>
                     <Avatar className="size-5">
                        <AvatarImage
                           src={verdictBy?.avatarUrl}
                           alt={verdictBy?.name ?? review.verdictById ?? 'Unknown'}
                        />
                        <AvatarFallback>
                           {(verdictBy?.name ?? review.verdictById ?? '?')[0]}
                        </AvatarFallback>
                     </Avatar>
                     <span className="text-sm text-muted-foreground">
                        {t('by')}{' '}
                        <span className="font-medium text-foreground">
                           {verdictBy?.name ?? review.verdictById ?? 'Unknown'}
                        </span>
                     </span>
                  </div>
               ) : (
                  <p className="text-sm text-muted-foreground">{t('No verdict yet')}</p>
               )}
            </section>
         </div>

         <div className="sticky bottom-4 flex justify-center pointer-events-none">
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border bg-container shadow-sm px-4 py-1.5 text-xs text-muted-foreground">
               {review.files.length} {t('files changed')}
               <DiffStat additions={review.additions} deletions={review.deletions} />
            </span>
         </div>
      </div>
   );
}
