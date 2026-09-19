'use client';

import {
   SidebarGroup,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
   Activity,
   Bell,
   Blocks,
   Bot,
   CircleDot,
   FileText,
   FolderOpen,
   GitPullRequest,
   Inbox,
   KeyRound,
   Link2,
   LucideIcon,
   Mail,
   Puzzle,
   Rocket,
   Settings,
   Smile,
   Sparkles,
   Tag,
   Tags,
   Target,
   Timer,
   UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useLanguage } from '@/components/providers/language-provider';

interface SettingsNavItem {
   name: string;
   /** Path under /{orgId}. */
   url: string;
   icon: LucideIcon;
}

interface SettingsNavGroup {
   label: string;
   items: SettingsNavItem[];
}

/** Linear-style settings navigation. */
export const settingsNav: SettingsNavGroup[] = [
   {
      label: 'Personal',
      items: [
         { name: 'Preferences', url: '/settings/preferences', icon: Settings },
         { name: 'Profile', url: '/settings/profile', icon: UserRound },
         { name: 'Notifications', url: '/settings/notifications', icon: Bell },
         { name: 'Security & access', url: '/settings/security', icon: KeyRound },
         { name: 'Agent personalization', url: '/settings/agent-personalization', icon: Bot },
         { name: 'Code & reviews', url: '/settings/code-and-reviews', icon: GitPullRequest },
         { name: 'Connected accounts', url: '/settings/connected-accounts', icon: Link2 },
      ],
   },
   {
      label: 'Workspace',
      items: [
         { name: 'AI & Agents', url: '/settings/ai', icon: Sparkles },
         { name: 'Issue labels', url: '/settings/issue-labels', icon: Tag },
         { name: 'Issue templates', url: '/settings/issue-templates', icon: FileText },
         { name: 'Project labels', url: '/settings/project-labels', icon: Tags },
         { name: 'Project statuses', url: '/settings/project-statuses', icon: CircleDot },
         { name: 'Project updates', url: '/settings/project-updates', icon: Blocks },
         { name: 'Documents', url: '/settings/documents', icon: FolderOpen },
         { name: 'Initiatives', url: '/settings/initiatives', icon: Target },
         { name: 'Releases', url: '/settings/releases', icon: Rocket },
         { name: 'Asks', url: '/settings/asks', icon: Inbox },
         { name: 'Customer requests', url: '/settings/customer-requests', icon: Mail },
         { name: 'SLAs', url: '/settings/slas', icon: Timer },
         { name: 'Emojis', url: '/settings/emojis', icon: Smile },
         { name: 'Integrations', url: '/settings/integrations', icon: Puzzle },
         { name: 'Pulse', url: '/settings/pulse', icon: Activity },
      ],
   },
];

export function NavSettings() {
   const { orgId } = useParams<{ orgId: string }>();
   const pathname = usePathname();
   const { t } = useLanguage();

   return (
      <>
         {settingsNav.map((group) => (
            <SidebarGroup key={group.label} className="group-data-[collapsible=icon]:hidden">
               <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>
               <SidebarMenu>
                  {group.items.map((item) => {
                     const href = `/${orgId}${item.url}`;
                     const isActive = pathname === href;
                     return (
                        <SidebarMenuItem key={`${group.label}-${item.name}`}>
                           <SidebarMenuButton asChild isActive={isActive}>
                              <Link href={href}>
                                 <item.icon className="size-4" />
                                 <span>{t(item.name)}</span>
                              </Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                     );
                  })}
               </SidebarMenu>
            </SidebarGroup>
         ))}
      </>
   );
}
