'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ActivityItem } from '@/mock-data/issue-details';
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
   RefreshCcw,
   Tag,
   Unlock,
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

function EventRow({ item }: { item: Extract<ActivityItem, { kind: 'event' }> }) {
   return (
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground py-1.5">
         <span className="size-5 rounded-full bg-accent flex items-center justify-center shrink-0">
            {EVENT_ICONS[item.event] ?? <CircleDot className="size-3.5" />}
         </span>
         <span className="min-w-0 truncate">
            <span className="text-foreground/90 font-medium">{item.actor.name}</span> {item.text}
         </span>
         <span className="shrink-0 text-xs">· {item.timeAgo}</span>
      </div>
   );
}

function CommentCard({ item }: { item: Extract<ActivityItem, { kind: 'comment' }> }) {
   return (
      <div className="my-2 rounded-lg border border-border/60 bg-container p-3.5">
         <div className="flex items-center gap-2 mb-1.5">
            <Avatar className="size-5">
               <AvatarImage src={item.actor.avatarUrl} alt={item.actor.name} />
               <AvatarFallback>{item.actor.name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{item.actor.name}</span>
            <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
         </div>
         <div className="text-sm [&_p]:my-1.5">
            <ContentBlocks blocks={item.body} />
         </div>
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
            <h2 className="text-base font-semibold">Activity</h2>
            {issueIdentifier && (
               <button
                  onClick={() => toggleSubscription(issueIdentifier)}
                  className="text-xs text-muted-foreground hover:text-foreground"
               >
                  {subscribed ? 'Unsubscribe' : 'Subscribe'}
               </button>
            )}
         </div>

         <div className="flex flex-col">
            {items.map((item) =>
               item.kind === 'event' ? (
                  <EventRow key={item.id} item={item} />
               ) : (
                  <CommentCard key={item.id} item={item} />
               )
            )}
         </div>

         {/* Composer */}
         <div className="mt-3 rounded-lg border border-border/60 bg-container p-3 flex flex-col gap-2">
            <textarea
               value={draft}
               onChange={(event) => setDraft(event.target.value)}
               onKeyDown={onComposerKeyDown}
               placeholder="Leave a comment..."
               rows={2}
               className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between">
               <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label="Attach a file to this issue"
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
                  Comment
               </Button>
            </div>
         </div>
      </div>
   );
}
