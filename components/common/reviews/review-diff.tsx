'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { formatRelativeTime } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
   getReviewFileDiff,
   type DiffLine,
   type FileDiff,
   type Review,
   type ReviewCommentItem,
   type ReviewFileStat,
} from '@/mock-data/reviews';
import { useMeStore } from '@/store/me-store';
import { useMembersStore } from '@/store/members-store';
import { useReviewsStore } from '@/store/reviews-store';
import { formatDistanceToNowStrict } from 'date-fns';
import {
   Check,
   FileCode2,
   GitCommitHorizontal,
   ListFilter,
   MessageSquarePlus,
   Search,
   SlidersHorizontal,
   Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DiffView } from './diff-view';

/** File-header lines of a unified git patch that carry no code. */
const PATCH_META =
   /^(diff --git|index |old mode |new mode |new file mode|deleted file mode|similarity index |dissimilarity index |rename from |rename to |copy from |copy to |Binary files|--- |\+\+\+ )/;

/**
 * Convert one file's raw unified patch into a `FileDiff` payload: '@@' headers
 * become muted hunk rows, '+/-' become add/del with running new-line numbers,
 * '\ No newline' markers become skip rows.
 */
function parsePatch(file: ReviewFileStat, patch: string): FileDiff {
   const lines: DiffLine[] = [];
   let additions = 0;
   let deletions = 0;
   let newLine = 0;

   // Drop one trailing empty artifact from `split('\n')` on a diff that ended
   // with a newline — it is not a real context line.
   const body = patch.endsWith('\n') ? patch.slice(0, -1) : patch;
   for (const raw of body.split('\n')) {
      if (PATCH_META.test(raw)) continue;
      if (raw.startsWith('@@')) {
         const match = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
         if (match) newLine = Number(match[1]);
         lines.push({ type: 'hunk', text: raw });
      } else if (raw.startsWith('+')) {
         additions += 1;
         lines.push({ type: 'add', number: newLine++, text: raw.slice(1) });
      } else if (raw.startsWith('-')) {
         deletions += 1;
         lines.push({ type: 'del', text: raw.slice(1) });
      } else if (raw.startsWith('\\')) {
         lines.push({ type: 'skip', text: raw });
      } else {
         lines.push({ type: 'context', number: newLine++, text: raw.slice(1) });
      }
   }

   // Real patches carry the file name inside the path; DiffView shows "path/"
   // as the directory prefix, so trim the file name off when present.
   const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : file.path;
   return { name: file.name, path: dir, additions, deletions, lines };
}

/** Compact note under a file block for a comment scoped to that file. */
function FileCommentNote({ review, comment }: { review: Review; comment: ReviewCommentItem }) {
   const { locale, t } = useLanguage();
   const deleteComment = useReviewsStore((s) => s.deleteComment);
   const getMemberById = useMembersStore((s) => s.getMemberById);
   const me = useMeStore((s) => s.me);
   const author = getMemberById(comment.authorId);
   const canDelete = Boolean(me) && (me?.id === comment.authorId || me?.role === 'Admin');

   return (
      <div className="group flex items-start gap-2 rounded-md border border-border/60 bg-container px-2.5 py-2">
         <Avatar className="size-4 mt-0.5">
            <AvatarImage src={author?.avatarUrl} alt={author?.name ?? comment.authorId} />
            <AvatarFallback>{(author?.name ?? comment.authorId)[0]}</AvatarFallback>
         </Avatar>
         <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-xs">
               <span className="font-medium">{author?.name ?? comment.authorId}</span>
               <span className="text-muted-foreground">
                  {formatRelativeTime(
                     locale,
                     formatDistanceToNowStrict(new Date(comment.createdAt), { addSuffix: true })
                  )}
               </span>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
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
}

/** One file: the real pasted patch when available (seeded demo rows fall back
 * to the deterministic generator), plus a per-file comment affordance. */
function FileDiffBlock({ review, file }: { review: Review; file: ReviewFileStat }) {
   const { t } = useLanguage();
   const addComment = useReviewsStore((s) => s.addComment);
   const [composing, setComposing] = useState(false);
   const [draft, setDraft] = useState('');
   const [posting, setPosting] = useState(false);

   const patch = review.diffs?.[file.path];
   const diff = useMemo(
      () => (patch !== undefined ? parsePatch(file, patch) : getReviewFileDiff(review, file)),
      [review, file, patch]
   );

   const comments = (review.comments ?? []).filter((comment) => comment.filePath === file.path);

   const submit = async () => {
      const text = draft.trim();
      if (!text || posting) return;
      setPosting(true);
      const ok = await addComment(review.id, text, file.path);
      setPosting(false);
      if (ok) {
         setDraft('');
         setComposing(false);
      }
   };

   return (
      <div id={`diff-${file.name}`}>
         <DiffView
            diff={diff}
            actions={
               <button
                  type="button"
                  onClick={() => setComposing((value) => !value)}
                  className={cn(
                     'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors',
                     composing ? 'bg-accent' : 'text-muted-foreground hover:bg-accent/50'
                  )}
               >
                  <MessageSquarePlus className="size-3.5" />
                  {t('Comment')}
               </button>
            }
         />
         {composing && (
            <div className="mt-2 rounded-lg border p-3 flex flex-col gap-2">
               <span className="text-xs text-muted-foreground">
                  {t('Comment on')} <span className="font-mono">{file.path}</span>
               </span>
               <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                     if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        void submit();
                     }
                  }}
                  rows={2}
                  autoFocus
                  placeholder={`${t('Leave a comment on')} ${file.name}…`}
                  className="min-h-0 resize-none"
               />
               <div className="flex items-center justify-end gap-2">
                  <Button
                     variant="ghost"
                     size="xs"
                     onClick={() => {
                        setComposing(false);
                        setDraft('');
                     }}
                     disabled={posting}
                  >
                     {t('Cancel')}
                  </Button>
                  <Button
                     size="xs"
                     onClick={() => void submit()}
                     disabled={!draft.trim() || posting}
                  >
                     {t('Comment')}
                  </Button>
               </div>
            </div>
         )}
         {comments.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
               {comments.map((comment) => (
                  <FileCommentNote key={comment.id} review={review} comment={comment} />
               ))}
            </div>
         )}
      </div>
   );
}

/** Diff tab: Files / Commits toolbar, file list and stacked unified diffs. */
export function ReviewDiff({ review }: { review: Review }) {
   const { locale, t } = useLanguage();
   const [query, setQuery] = useState('');

   const files = useMemo(
      () =>
         review.files.filter((file) =>
            (file.name + file.path).toLowerCase().includes(query.trim().toLowerCase())
         ),
      [review.files, query]
   );

   return (
      <div className="h-full flex flex-col overflow-hidden">
         <div className="flex items-center justify-between gap-2 px-4 py-2 border-b shrink-0">
            <div className="flex items-center gap-1.5 text-xs">
               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-accent font-medium">
                  <ListFilter className="size-3.5" />
                  {t('Files')}
                  <span className="text-muted-foreground">{review.files.length}</span>
               </span>
               <Popover>
                  <PopoverTrigger asChild>
                     <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-muted-foreground hover:bg-accent/50 transition-colors">
                        <GitCommitHorizontal className="size-3.5" />
                        {t('Commits')}
                        <span>{review.commits.length}</span>
                     </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-96 p-0 text-sm">
                     <div className="flex items-center justify-between px-3 py-2 border-b">
                        <span className="font-medium">{t('All commits')}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                           <Check className="size-3.5" />
                           {review.commits.length} {t('commits')}
                        </span>
                     </div>
                     {review.commits.map((commit) => (
                        <div
                           key={commit.sha}
                           className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 text-xs"
                        >
                           <span className="font-mono text-muted-foreground">{commit.sha}</span>
                           <span className="flex-1 truncate">{commit.message}</span>
                           <span className="text-muted-foreground shrink-0">
                              {formatRelativeTime(locale, commit.timeAgo)}
                           </span>
                        </div>
                     ))}
                  </PopoverContent>
               </Popover>
            </div>
            <SlidersHorizontal className="size-4 text-muted-foreground" />
         </div>

         <div className="flex-1 min-h-0 flex overflow-hidden">
            <div className="hidden md:flex flex-col w-64 shrink-0 border-r p-3 gap-2 overflow-y-auto">
               <div className="relative shrink-0">
                  <Search className="size-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                     placeholder={t('Filter files…')}
                     value={query}
                     onChange={(event) => setQuery(event.target.value)}
                     className="pl-7 h-8 text-xs"
                  />
               </div>
               {files.map((file) => (
                  <a
                     key={file.name + file.path}
                     href={`#diff-${file.name}`}
                     className={cn(
                        'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors'
                     )}
                  >
                     <FileCode2 className="size-3.5 text-muted-foreground shrink-0" />
                     <span className="font-medium truncate">{file.name}</span>
                     <span className="text-muted-foreground truncate">{file.path}</span>
                  </a>
               ))}
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto p-4 flex flex-col gap-4">
               {files.map((file) => (
                  <FileDiffBlock key={file.name + file.path} review={review} file={file} />
               ))}
            </div>
         </div>
      </div>
   );
}
