'use client';

import { ContentBlocks } from '@/components/common/issues/details/content-blocks';
import { IssuePropertiesPanel } from '@/components/common/issues/details/issue-properties-panel';
import { LabelBadge } from '@/components/common/issues/label-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getNotificationIcon } from '@/lib/notification-utils';
import { useIssueDetail } from '@/store/issue-details-store';
import type { IssueDetail } from '@/mock-data/issue-details';
import { InboxItem } from '@/mock-data/inbox';
import { useIssuesStore } from '@/store/issues-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useIssueDetailsStore } from '@/store/issue-details-store';
import { useAttachmentsStore } from '@/store/attachments-store';
import { useMeStore } from '@/store/me-store';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowUpRight, Check, Loader2, Paperclip, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { NotificationBox } from './icons/motification-box';
import { useLanguage } from '@/components/providers/language-provider';
import { formatRelativeTime } from '@/lib/i18n';

interface IssuePreviewProps {
   notification?: InboxItem;
   onMarkAsRead?: (id: string) => void;
}

/**
 * Inbox preview pane: shows the REAL issue behind the selected
 * notification (live status/assignee from the store, rich description
 * from issue-details) plus the notification context.
 */
/** Placeholder while the issue detail is still loading (the fetch is async). */
const LOADING_DETAIL: IssueDetail = {
   identifier: '',
   description: [],
   activity: [],
   subscribed: false,
};

export default function IssuePreview({ notification, onMarkAsRead }: IssuePreviewProps) {
   const { orgId } = useParams<{ orgId: string }>();
   const { locale, t } = useLanguage();
   const { getUnreadCount } = useNotificationsStore();
   const { issues } = useIssuesStore();

   const liveIssue = notification
      ? (issues.find((c) => c.identifier === notification.identifier) ?? notification)
      : undefined;
   const detailMaybe = useIssueDetail(liveIssue);
   const commentTarget = notification?.identifier;
   const postComment = useIssueDetailsStore((s) => s.postComment);
   const uploadAttachment = useAttachmentsStore((s) => s.upload);
   const me = useMeStore((s) => s.me);
   const [commentDraft, setCommentDraft] = useState('');
   const [posting, setPosting] = useState(false);
   const fileRef = useRef<HTMLInputElement>(null);

   const canComment = Boolean(me && commentTarget);

   const submitComment = () => {
      const text = commentDraft.trim();
      if (!text || !canComment || !commentTarget) return;
      setPosting(true);
      try {
         postComment(displayIssue.identifier, text);
         setCommentDraft('');
      } finally {
         setPosting(false);
      }
   };

   const onAttach = async (files: FileList | null) => {
      if (!files?.length || !canComment || !commentTarget) return;
      for (const file of Array.from(files)) {
         await uploadAttachment(commentTarget, file);
      }
      toast.success(
         `${files.length} ${t(files.length === 1 ? 'attached file' : 'attached files')}`
      );
      if (fileRef.current) fileRef.current.value = '';
   };

   if (!notification) {
      const unreadCount = getUnreadCount();

      return (
         <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <NotificationBox className="w-16 h-16 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
               {unreadCount} {t(unreadCount === 1 ? 'unread notification' : 'unread notifications')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
               {t('Select a notification from the list to view its details and take action.')}
            </p>
         </div>
      );
   }

   // Live issue from the store (falls back to the notification snapshot).
   const displayIssue = liveIssue ?? notification;
   const detail = detailMaybe ?? LOADING_DETAIL;

   return (
      <div className="flex flex-col h-full overflow-hidden">
         {/* Header */}
         <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0">
            <div className="flex items-center gap-2 min-w-0">
               <displayIssue.status.icon />
               <span className="text-sm font-medium truncate">{displayIssue.identifier}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
               {!notification.read && onMarkAsRead && (
                  <Button
                     variant="outline"
                     size="xs"
                     onClick={() => onMarkAsRead(notification.id)}
                     className="gap-1"
                  >
                     <Check className="size-4" />
                     {t('Mark as read')}
                  </Button>
               )}
               <Button variant="ghost" size="xs" asChild>
                  <Link href={`/${orgId ?? 'lndev-ui'}/issue/${displayIssue.identifier}`}>
                     {t('Open')}
                     <ArrowUpRight className="size-3.5 ml-0.5" />
                  </Link>
               </Button>
            </div>
         </div>

         {/* Real issue preview + properties column (Linear-style) */}
         <div className="flex-1 min-h-0 flex overflow-hidden">
            <div className="flex-1 min-w-0 overflow-y-auto">
               <div className="pt-8 pb-6 px-6 w-full max-w-3xl mx-auto">
                  {/* Notification context */}
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg mb-8">
                     <div className="relative shrink-0">
                        <Avatar className="size-7">
                           <AvatarImage
                              src={notification.user.avatarUrl}
                              alt={notification.user.name}
                           />
                           <AvatarFallback className="text-xs">
                              {notification.user.name[0]}
                           </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-accent border border-background flex items-center justify-center">
                           {getNotificationIcon(notification.type, 'size-2.5')}
                        </div>
                     </div>
                     <div className="min-w-0 text-sm">
                        <span className="font-medium">{notification.user.name}</span>{' '}
                        <span className="text-muted-foreground">
                           ·{' '}
                           {formatRelativeTime(
                              locale,
                              formatDistanceToNowStrict(new Date(notification.timestamp), {
                                 addSuffix: true,
                              })
                           )}
                        </span>
                     </div>
                  </div>

                  <h3 className="text-2xl font-semibold text-foreground text-balance">
                     {displayIssue.title}
                  </h3>

                  {/* Properties row */}
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-4 text-sm xl:hidden">
                     <span className="flex items-center gap-1.5">
                        <displayIssue.status.icon />
                        {t(displayIssue.status.name)}
                     </span>
                     <span className="flex items-center gap-1.5 text-muted-foreground">
                        <displayIssue.priority.icon className="size-3.5" />
                        {t(displayIssue.priority.name)}
                     </span>
                     {displayIssue.assignee && (
                        <span className="flex items-center gap-1.5">
                           <Avatar className="size-4">
                              <AvatarImage
                                 src={displayIssue.assignee.avatarUrl}
                                 alt={displayIssue.assignee.name}
                              />
                              <AvatarFallback className="text-[9px]">
                                 {displayIssue.assignee.name[0]}
                              </AvatarFallback>
                           </Avatar>
                           {displayIssue.assignee.name}
                        </span>
                     )}
                     <LabelBadge label={displayIssue.labels} />
                  </div>

                  {/* Real description */}
                  <div className="mt-6">
                     <ContentBlocks blocks={detail.description} />
                  </div>

                  {/* Comment composer */}
                  <div className="relative w-full flex flex-col mt-10">
                     <Textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              submitComment();
                           }
                        }}
                        disabled={!canComment}
                        className="w-full rounded-lg border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent pb-14 resize-none"
                        placeholder={
                           canComment
                              ? t('Leave a comment... (⌘↵ to submit)')
                              : t('Sign in to comment')
                        }
                        rows={3}
                     />
                     <div className="absolute right-3 bottom-3 flex items-center gap-3">
                        <input
                           ref={fileRef}
                           type="file"
                           multiple
                           className="hidden"
                           onChange={(e) => void onAttach(e.target.files)}
                        />
                        <Button
                           size="icon"
                           variant="ghost"
                           aria-label={t('Attach files')}
                           disabled={!canComment}
                           onClick={() => fileRef.current?.click()}
                        >
                           <Paperclip className="w-4 h-4" />
                        </Button>
                        <Button
                           size="icon"
                           variant="secondary"
                           aria-label={t('Send comment')}
                           disabled={!canComment || !commentDraft.trim() || posting}
                           onClick={submitComment}
                        >
                           {posting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                           ) : (
                              <Send className="w-4 h-4" />
                           )}
                        </Button>
                     </div>
                  </div>
               </div>
            </div>

            {liveIssue && (
               <aside className="hidden xl:block w-64 shrink-0 border-l overflow-y-auto bg-container px-4 py-5">
                  <IssuePropertiesPanel issue={liveIssue} detail={detail} />
               </aside>
            )}
         </div>
      </div>
   );
}
