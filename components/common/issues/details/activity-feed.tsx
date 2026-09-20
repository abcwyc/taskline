'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/i18n';
import { ActivityItem, ContentBlock } from '@/mock-data/issue-details';
import { useAttachmentsStore } from '@/store/attachments-store';
import { useIssueDetailsStore } from '@/store/issue-details-store';
import { useMeStore } from '@/store/me-store';
import {
   Ban,
   CircleDot,
   GitPullRequestArrow,
   Link2,
   Loader2,
   Paperclip,
   PenLine,
   Pencil,
   RefreshCcw,
   Tag,
   Trash2,
   Unlock,
   X,
} from 'lucide-react';
import { ReactNode, useRef, useState } from 'react';
import { ContentBlocks } from './content-blocks';

const EVENT_ICONS: Record<string, ReactNode> = {
   created: <PenLine className="size-3.5" />,
   status: <CircleDot className="size-3.5" />,
   label: <Tag className="size-3.5" />,
   priority: <CircleDot className="size-3.5" />,
   cycle: <RefreshCcw className="size-3.5" />,
   blocked: <Ban className="size-3.5" />,
   unblocked: <Unlock className="size-3.5" />,
   related: <Link2 className="size-3.5" />,
   pr: <GitPullRequestArrow className="size-3.5" />,
};

/** Joins translated fragments, spacing only between CJK and Latin runs. */
function joinFragments(parts: string[]): string {
   const isCjk = (ch: string | undefined) => Boolean(ch) && /[\u4e00-\u9fff]/.test(ch as string);
   return parts.reduce((acc, part) => {
      if (!acc) return part;
      const separator = isCjk(acc.slice(-1)) !== isCjk(part.slice(0, 1)) ? ' ' : '';
      return acc + separator + part;
   }, '');
}

/** Translates a comma / "and" separated list of enum names. */
function translateNameList(t: (key: string) => string, raw: string): string {
   return raw
      .split(/, | and /)
      .map((name) => t(name.trim()))
      .join('、');
}

/** Translates an activity event sentence composed of fixed fragments + names. */
function translateEvent(t: (key: string) => string, text: string): string {
   const direct = t(text);
   if (direct !== text) return direct;

   let match = text.match(/^moved from (.+) to (.+)$/);
   if (match) return joinFragments([t('moved from'), t(match[1]), t('to'), t(match[2])]);

   match = text.match(/^added labels? (.+)$/);
   if (match) return joinFragments([t('added label'), translateNameList(t, match[1])]);

   match = text.match(/^added issue to (.+)$/);
   if (match) return joinFragments([t('added issue to'), match[1]]);

   match = text.match(/^added to (.+)$/);
   if (match) return joinFragments([t('added to'), match[1]]);

   match = text.match(/^set priority to (.+)$/);
   if (match) return joinFragments([t('set priority to'), t(match[1])]);

   match = text.match(/^raised the priority to (.+?)(?: — (.+))?$/);
   if (match) {
      const raised = joinFragments([t('raised the priority to'), t(match[1])]);
      return match[2] ? `${raised} — ${match[2]}` : raised;
   }

   match = text.match(/^marked this issue as blocked by (.+)$/);
   if (match) return joinFragments([t('marked this issue as blocked by'), match[1], t('blocked')]);

   match = text.match(/^changed (.+?) to (?:added |removed )?(.+)$/);
   if (match) {
      // 'labels' is taken by the count suffix key ('n labels' → '个标签'); reuse 'Labels'.
      const field = match[1] === 'labels' ? 'Labels' : match[1];
      return joinFragments([t('changed'), t(field), t('to'), translateNameList(t, match[2])]);
   }

   match = text.match(/^cleared the (.+)$/);
   if (match) return joinFragments([t('cleared the'), t(match[1])]);

   match = text.match(/^assigned this to (.+)$/);
   if (match) return joinFragments([t('assigned this to'), match[1]]);

   match = text.match(/^linked pull request (.+)$/);
   if (match) return joinFragments([t('linked pull request'), match[1]]);

   match = text.match(/^linked (.+)$/);
   if (match) return joinFragments([t('linked'), match[1]]);

   match = text.match(/^added (.+)$/);
   if (match) return joinFragments([t('added'), translateNameList(t, match[1])]);

   return text;
}

function EventRow({ item }: { item: Extract<ActivityItem, { kind: 'event' }> }) {
   const { locale, t } = useLanguage();
   return (
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground py-1.5">
         <span className="size-5 rounded-full bg-accent flex items-center justify-center shrink-0">
            {EVENT_ICONS[item.event] ?? <CircleDot className="size-3.5" />}
         </span>
         <span className="min-w-0 truncate">
            <span className="text-foreground/90 font-medium">{item.actor.name}</span>
            {locale === 'zh-CN' ? translateEvent(t, item.text) : ` ${item.text}`}
         </span>
         <span className="shrink-0 text-xs">· {formatRelativeTime(locale, item.timeAgo)}</span>
      </div>
   );
}

/** Plain-text projection of a comment body, for prefilling the edit textarea. */
function commentBodyToText(blocks: ContentBlock[]): string {
   return blocks
      .filter(
         (block): block is Extract<ContentBlock, { type: 'paragraph' }> =>
            block.type === 'paragraph'
      )
      .map((block) => block.text)
      .join('\n\n');
}

function CommentCard({
   item,
   issueIdentifier,
}: {
   item: Extract<ActivityItem, { kind: 'comment' }>;
   issueIdentifier?: string;
}) {
   const meId = useMeStore((s) => s.me?.id);
   const meRole = useMeStore((s) => s.me?.role);
   const { locale, t } = useLanguage();
   const editComment = useIssueDetailsStore((s) => s.editComment);
   const deleteComment = useIssueDetailsStore((s) => s.deleteComment);
   const [editing, setEditing] = useState(false);
   const [draft, setDraft] = useState('');
   const [confirmingDelete, setConfirmingDelete] = useState(false);

   const canModerate =
      Boolean(issueIdentifier) && Boolean(meId) && (meId === item.actor.id || meRole === 'Admin');
   const originalText = commentBodyToText(item.body);

   const startEditing = () => {
      setDraft(originalText);
      setConfirmingDelete(false);
      setEditing(true);
   };

   const saveEdit = () => {
      const text = draft.trim();
      if (!text || text === originalText || !issueIdentifier) return;
      editComment(issueIdentifier, item.id, text);
      setEditing(false);
   };

   const onEditKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
         event.preventDefault();
         saveEdit();
      } else if (event.key === 'Escape') {
         event.preventDefault();
         setEditing(false);
      }
   };

   return (
      <div className="group my-2 rounded-lg border border-border/60 bg-container p-3.5">
         <div className="flex items-center gap-2 mb-1.5">
            <Avatar className="size-5">
               <AvatarImage src={item.actor.avatarUrl} alt={item.actor.name} />
               <AvatarFallback>{item.actor.name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{item.actor.name}</span>
            <span className="text-xs text-muted-foreground">
               {formatRelativeTime(locale, item.timeAgo)}
            </span>
            {item.editedAt && (
               <span className="text-xs text-muted-foreground/70">{t('(edited)')}</span>
            )}
            {canModerate && !editing && (
               <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {confirmingDelete ? (
                     <>
                        <button
                           type="button"
                           onClick={() =>
                              issueIdentifier && deleteComment(issueIdentifier, item.id)
                           }
                           className="text-xs px-1.5 py-0.5 rounded text-red-500 hover:bg-red-500/10"
                        >
                           {t('Delete?')}
                        </button>
                        <button
                           type="button"
                           aria-label={t('Cancel delete')}
                           onClick={() => setConfirmingDelete(false)}
                           className="text-muted-foreground hover:text-foreground"
                        >
                           <X className="size-3.5" />
                        </button>
                     </>
                  ) : (
                     <>
                        <button
                           type="button"
                           aria-label={t('Edit comment')}
                           onClick={startEditing}
                           className="text-muted-foreground hover:text-foreground"
                        >
                           <Pencil className="size-3.5" />
                        </button>
                        <button
                           type="button"
                           aria-label={t('Delete comment')}
                           onClick={() => setConfirmingDelete(true)}
                           className="text-muted-foreground hover:text-red-500"
                        >
                           <Trash2 className="size-3.5" />
                        </button>
                     </>
                  )}
               </div>
            )}
         </div>
         {editing ? (
            <div className="flex flex-col gap-2">
               <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onEditKeyDown}
                  rows={3}
                  autoFocus
                  placeholder={t('Edit comment...')}
                  className="w-full resize-none rounded-md border border-border/60 bg-transparent p-2 text-sm outline-none focus:border-ring placeholder:text-muted-foreground"
               />
               <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>
                     {t('Cancel')}
                  </Button>
                  <Button
                     size="xs"
                     onClick={saveEdit}
                     disabled={!draft.trim() || draft.trim() === originalText}
                  >
                     {t('Save')}
                  </Button>
               </div>
            </div>
         ) : (
            <div className="text-sm [&_p]:my-1.5">
               <ContentBlocks blocks={item.body} />
            </div>
         )}
         {item.reactions && item.reactions.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
               {item.reactions.map((reaction) => (
                  <span
                     key={reaction.emoji}
                     className="inline-flex items-center gap-1 text-xs bg-accent/60 border border-border/60 rounded-full px-2 py-0.5"
                  >
                     {reaction.emoji} {reaction.count}
                  </span>
               ))}
            </div>
         )}
      </div>
   );
}

/**
 * Issue activity: interleaved events and comments, plus a comment composer.
 * `activity` comes from the issue-details store; posting a comment persists it.
 */
export function ActivityFeed({
   activity,
   issueIdentifier,
}: {
   activity: ActivityItem[];
   issueIdentifier?: string;
}) {
   const postComment = useIssueDetailsStore((s) => s.postComment);
   const toggleSubscription = useIssueDetailsStore((s) => s.toggleSubscription);
   const { t } = useLanguage();
   const subscribed = useIssueDetailsStore((s) =>
      issueIdentifier ? Boolean(s.byIdentifier[issueIdentifier]?.subscribed) : false
   );
   const submitOn = useMeStore((s) => s.preferences.submitCommentOn);
   const uploadAttachment = useAttachmentsStore((s) => s.upload);
   const uploadingAttachment = useAttachmentsStore((s) =>
      issueIdentifier ? s.uploading[issueIdentifier] : false
   );
   const fileRef = useRef<HTMLInputElement>(null);
   const [draft, setDraft] = useState('');
   const items = activity;

   const onAttach = async (files: FileList | null) => {
      if (!files || !issueIdentifier) return;
      for (const file of Array.from(files)) await uploadAttachment(issueIdentifier, file);
      if (fileRef.current) fileRef.current.value = '';
   };

   const submitComment = () => {
      const text = draft.trim();
      if (!text || !issueIdentifier) return;
      postComment(issueIdentifier, text);
      setDraft('');
   };

   const onComposerKeyDown = (event: React.KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      const withMod = event.metaKey || event.ctrlKey;
      if (submitOn === 'enter' ? !event.shiftKey && !withMod : withMod) {
         event.preventDefault();
         submitComment();
      }
   };

   return (
      <div className="mt-10">
         <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold">{t('Activity')}</h2>
            {issueIdentifier && (
               <button
                  onClick={() => toggleSubscription(issueIdentifier)}
                  className="text-xs text-muted-foreground hover:text-foreground"
               >
                  {subscribed ? t('Unsubscribe') : t('Subscribe')}
               </button>
            )}
         </div>

         <div className="flex flex-col">
            {items.map((item) =>
               item.kind === 'event' ? (
                  <EventRow key={item.id} item={item} />
               ) : (
                  <CommentCard key={item.id} item={item} issueIdentifier={issueIdentifier} />
               )
            )}
         </div>

         {/* Composer */}
         <div className="mt-3 rounded-lg border border-border/60 bg-container p-3 flex flex-col gap-2">
            <textarea
               value={draft}
               onChange={(event) => setDraft(event.target.value)}
               onKeyDown={onComposerKeyDown}
               placeholder={t('Leave a comment…')}
               rows={2}
               className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between">
               <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label={t('Attach a file to this issue')}
               >
                  {uploadingAttachment ? (
                     <Loader2 className="size-4 animate-spin" />
                  ) : (
                     <Paperclip className="size-4" />
                  )}
               </button>
               <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => onAttach(e.target.files)}
               />
               <Button size="xs" onClick={submitComment} disabled={!draft.trim()}>
                  {t('Comment')}
               </Button>
            </div>
         </div>
      </div>
   );
}
