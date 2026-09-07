import { Inbox, FolderKanban } from 'lucide-react';

// `url` is the path under /{orgId}; callers prefix with the active workspace slug.
export const inboxItems = [
   {
      name: 'Inbox',
      url: '/inbox',
      icon: Inbox,
   },
   {
      name: 'My issues',
      url: '/my-issues',
      icon: FolderKanban,
   },
];
