'use client';

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
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/language-provider';
import { useReviewsStore } from '@/store/reviews-store';
import {
   Check,
   CircleSlash,
   GitMerge,
   Link2,
   MoreHorizontal,
   RotateCcw,
   Star,
   Trash2,
   X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ReviewDiff } from './review-diff';
import { ReviewGuide } from './review-guide';
import { ReviewOverview } from './review-overview';
import { DiffStat, IssueCheckIcon, PrIcon } from './review-shared';

export type ReviewSection = 'overview' | 'guide' | 'diff';

const SECTION_TABS: { key: ReviewSection; label: string; path: string }[] = [
   { key: 'overview', label: 'Overview', path: '' },
   { key: 'guide', label: 'Guide', path: '/review' },
   { key: 'diff', label: 'Diff', path: '/changes' },
];

/** Right pane of the Reviews split view: breadcrumb, tabs and section body. */
export function ReviewDetail({ reviewId, section }: { reviewId: string; section: ReviewSection }) {
   const { t } = useLanguage();
   const { orgId } = useParams<{ orgId: string }>();
   const router = useRouter();
   const review = useReviewsStore((s) => s.getReviewById(reviewId));
   const setVerdict = useReviewsStore((s) => s.setVerdict);
   const setStatus = useReviewsStore((s) => s.setStatus);
   const removeReview = useReviewsStore((s) => s.removeReview);
   const [deleteOpen, setDeleteOpen] = useState(false);

   if (!review) {
      return (
         <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            {t('Review not found')}
         </div>
      );
   }

   const isOpen = review.status === 'open';

   return (
      <div className="h-full flex flex-col overflow-hidden">
         <div className="flex items-center gap-2 px-4 h-10 border-b shrink-0 min-w-0">
            <Link
               href={`/${orgId}/issue/${review.resolves.identifier}`}
               className="flex items-center gap-1.5 shrink-0 hover:opacity-80"
            >
               <IssueCheckIcon />
               <span className="text-sm font-medium">{review.resolves.identifier}</span>
            </Link>
            <span className="text-muted-foreground text-xs shrink-0">›</span>
            <PrIcon status={review.status} />
            <span className="text-sm font-medium truncate">{review.title}</span>
            <DiffStat additions={review.additions} deletions={review.deletions} />
            {review.verdict && (
               <span
                  className={cn(
                     'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0',
                     review.verdict === 'approved'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  )}
               >
                  {review.verdict === 'approved' ? (
                     <Check className="size-3" />
                  ) : (
                     <X className="size-3" />
                  )}
                  {review.verdict === 'approved' ? t('Approved') : t('Changes requested')}
               </span>
            )}
            <span className="flex-1" />
            <Star className="size-3.5 text-muted-foreground shrink-0" />
            <Link2 className="size-3.5 text-muted-foreground shrink-0 hidden sm:block" />
         </div>
         <div className="flex items-center justify-between px-4 h-10 border-b shrink-0">
            <div className="flex items-center gap-1.5">
               {SECTION_TABS.map((tab) => (
                  <Link
                     key={tab.key}
                     href={`/${orgId}/review/${review.id}${tab.path}`}
                     className={cn(
                        'px-2.5 py-1 rounded-md border text-xs font-medium transition-colors',
                        section === tab.key
                           ? 'bg-accent border-transparent'
                           : 'text-muted-foreground hover:bg-accent/50'
                     )}
                  >
                     {t(tab.label)}
                  </Link>
               ))}
            </div>
            <div className="flex items-center gap-1.5">
               <Button
                  size="xs"
                  variant="outline"
                  disabled={!isOpen}
                  title={isOpen ? t('Approve this review') : t('Only open reviews can be reviewed')}
                  onClick={() => setVerdict(review.id, 'approved')}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
               >
                  <Check className="size-3.5" />
                  {t('Approve')}
               </Button>
               <Button
                  size="xs"
                  variant="outline"
                  disabled={!isOpen}
                  title={
                     isOpen
                        ? t('Request changes on this review')
                        : t('Only open reviews can be reviewed')
                  }
                  onClick={() => setVerdict(review.id, 'changes_requested')}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-400"
               >
                  <X className="size-3.5" />
                  {t('Request changes')}
               </Button>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        size="xs"
                        variant="ghost"
                        className="size-7 px-0"
                        aria-label={t('More review actions')}
                     >
                        <MoreHorizontal className="size-3.5" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                     {isOpen ? (
                        <>
                           <DropdownMenuItem onClick={() => setStatus(review.id, 'merged')}>
                              <GitMerge />
                              {t('Mark merged')}
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => setStatus(review.id, 'closed')}>
                              <CircleSlash />
                              {t('Close review')}
                           </DropdownMenuItem>
                        </>
                     ) : (
                        <DropdownMenuItem onClick={() => setStatus(review.id, 'open')}>
                           <RotateCcw />
                           {t('Reopen')}
                        </DropdownMenuItem>
                     )}
                     <DropdownMenuSeparator />
                     <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                        <Trash2 />
                        {t('Delete review')}
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </div>
         <div className="flex-1 min-h-0 overflow-hidden">
            {section === 'overview' && <ReviewOverview review={review} />}
            {section === 'guide' && <ReviewGuide review={review} />}
            {section === 'diff' && <ReviewDiff review={review} />}
         </div>

         <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>{t('Delete review?')}</AlertDialogTitle>
                  <AlertDialogDescription>
                     {t('This permanently deletes')} “{review.title}”{' '}
                     {t('together with its comments. This action cannot be undone.')}
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                     className="bg-destructive text-white hover:bg-destructive/90"
                     onClick={() => {
                        removeReview(review.id);
                        router.push(`/${orgId}/reviews`);
                     }}
                  >
                     {t('Delete')}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </div>
   );
}
