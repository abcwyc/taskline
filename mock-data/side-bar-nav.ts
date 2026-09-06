import { Bot, GitPullRequestArrow, Inbox, FolderKanban } from 'lucide-react';

// `url` is the path under /{orgId}; callers prefix with the active workspace slug.
export const inboxItems = [
   {
      name: 'Inbox',
      url: '/inbox',
      icon: Inbox,
   },
   {
      name: 'Reviews',
      url: '/reviews',
      icon: GitPullRequestArrow,
   },
   {
      name: 'My issues',
      url: '/my-issues',
      icon: FolderKanban,
   },
   {
      name: 'Agent',
      url: '/agent',
      icon: Bot,
   },
];
