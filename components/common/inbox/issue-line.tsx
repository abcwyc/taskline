'use client';

import { InboxItem } from '@/mock-data/inbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getNotificationIcon } from '@/lib/notification-utils';
import { renderStatusIcon } from '@/lib/status-utils';
import { useNotificationsStore } from '@/store/notifications-store';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlarmClock, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '@/components/providers/language-provider';
import { formatRelativeTime } from '@/lib/i18n';

interface IssueLineProps {
   notification: InboxItem;
   layoutId?: boolean;
   isSelected?: boolean;
   onClick?: () => void;
   showId?: boolean;
   showStatusIcon?: boolean;
}

export default function IssueLine({
   notification,
   layoutId = false,
   isSelected = false,
   onClick,
   showId = true,
   showStatusIcon = true,
}: IssueLineProps) {
   const deleteNotification = useNotificationsStore((s) => s.deleteNotification);
   const snoozeNotification = useNotificationsStore((s) => s.snoozeNotification);
   const { locale, t } = useLanguage();

   return (
      <motion.div
         {...(layoutId && { layoutId: `notification-line-${notification.id}` })}
         onClick={onClick}
         className="w-full px-0.75 py-0.25"
      >
         <div
            className={cn(
               'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sidebar/80 dark:hover:bg-sidebar/50 transition-colors cursor-pointer rounded-lg group',
               isSelected && 'bg-accent/80 dark:bg-accent/50'
            )}
         >
            <div className="relative flex-shrink-0">
               <Avatar className="size-8">
                  <AvatarImage src={notification.user.avatarUrl} alt={notification.user.name} />
                  <AvatarFallback className="text-xs">
                     {notification.user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                  </AvatarFallback>
               </Avatar>

               <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-accent border-2 border-background flex items-center justify-center">
                  {getNotificationIcon(notification.type, 'size-3')}
               </div>
            </div>

            <div className="w-full">
               <div className="flex items-center gap-1.5">
                  {!notification.read && (
                     <div className="size-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                  {showId && (
                     <span
                        className={cn(
                           'text-sm font-medium text-muted-foreground shrink-0',
                           notification.read && 'opacity-50'
                        )}
                     >
                        {notification.identifier}
                     </span>
                  )}

                  <h4
                     className={cn(
                        'text-sm font-medium text-foreground line-clamp-1 flex-grow',
                        notification.read && 'opacity-50'
                     )}
                  >
                     {notification.title}
                  </h4>

                  {showStatusIcon && (
                     <div className="shrink-0">{renderStatusIcon(notification.status.id)}</div>
                  )}
               </div>

               <div
                  className={cn(
                     'flex items-center justify-between gap-1.5 transition-opacity duration-200',
                     notification.read && 'opacity-50'
                  )}
               >
                  <p className="text-sm text-muted-foreground line-clamp-1">
                     {t(notification.content)}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0 group-hover:hidden">
                     {formatRelativeTime(
                        locale,
                        formatDistanceToNowStrict(new Date(notification.timestamp), {
                           addSuffix: true,
                        })
                     )}
                  </span>
                  <div
                     className="hidden group-hover:flex items-center gap-0.5 shrink-0"
                     onClick={(event) => event.stopPropagation()}
                  >
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <button
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              aria-label={t('Snooze notification')}
                              title={t('Snooze')}
                           >
                              <AlarmClock className="size-3.5" />
                           </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => snoozeNotification(notification.id, 1)}>
                              {t('Snooze 1 hour')}
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => snoozeNotification(notification.id, 3)}>
                              {t('Snooze 3 hours')}
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              onClick={() => snoozeNotification(notification.id, 16)}
                           >
                              {t('Snooze until tomorrow')}
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                     <button
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        onClick={() => deleteNotification(notification.id)}
                        aria-label={t('Delete notification')}
                        title={t('Delete')}
                     >
                        <Trash2 className="size-3.5" />
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </motion.div>
   );
}
