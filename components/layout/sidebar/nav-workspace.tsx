'use client';

import {
   Box,
   Compass,
   ContactRound,
   GitPullRequestArrow,
   Layers,
   LayoutList,
   LucideIcon,
   MoreHorizontal,
   UserRound,
   Sparkles,
} from 'lucide-react';

import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
   SidebarGroup,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
   isSidebarItemVisible,
   resolveOrder,
   SidebarItemKey,
   useSidebarPrefsStore,
} from '@/store/sidebar-prefs-store';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CustomizeSidebarDialog } from './customize-sidebar-dialog';
import { useLanguage } from '@/components/providers/language-provider';

interface WorkspaceNavItem {
   key: SidebarItemKey;
   name: string;
   icon: LucideIcon;
   /** Path under /{orgId}. */
   url: string;
}

const WORKSPACE_NAV: WorkspaceNavItem[] = [
   { key: 'initiatives', name: 'Initiatives', icon: Compass, url: '/initiatives' },
   { key: 'projects', name: 'Projects', icon: Box, url: '/projects' },
   { key: 'views', name: 'Views', icon: Layers, url: '/views' },
   { key: 'agent', name: 'Agent', icon: Sparkles, url: '/agent' },
   { key: 'reviews', name: 'Reviews', icon: GitPullRequestArrow, url: '/reviews' },
   { key: 'teams', name: 'Teams', icon: ContactRound, url: '/teams' },
   { key: 'members', name: 'Members', icon: UserRound, url: '/members' },
];

export function NavWorkspace() {
   const { orgId } = useParams<{ orgId: string }>();
   const { visibility, order } = useSidebarPrefsStore();
   const [customizeOpen, setCustomizeOpen] = useState(false);
   const [mounted, setMounted] = useState(false);
   const { t } = useLanguage();
   useEffect(() => setMounted(true), []);

   const orderedNav = mounted
      ? resolveOrder(
           order.workspace,
           WORKSPACE_NAV.map((item) => item.key)
        )
           .map((key) => WORKSPACE_NAV.find((item) => item.key === key))
           .filter((item): item is WorkspaceNavItem => Boolean(item))
      : WORKSPACE_NAV;

   const items = orderedNav.filter((item) =>
      mounted ? isSidebarItemVisible(visibility[item.key], 0) : true
   );
   const hidden = mounted
      ? orderedNav.filter((item) => !isSidebarItemVisible(visibility[item.key], 0))
      : [];

   return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
         <SidebarGroupLabel>{t('Workspace')}</SidebarGroupLabel>
         <SidebarMenu>
            {items.map((item) => (
               <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                     <Link href={`/${orgId}${item.url}`}>
                        <item.icon />
                        <span>{t(item.name)}</span>
                     </Link>
                  </SidebarMenuButton>
               </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <SidebarMenuButton asChild>
                        <span>
                           <MoreHorizontal />
                           <span>{t('More')}</span>
                        </span>
                     </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 rounded-lg" side="bottom" align="start">
                     {hidden.map((item) => (
                        <DropdownMenuItem key={item.key} asChild>
                           <Link href={`/${orgId}${item.url}`}>
                              <item.icon className="text-muted-foreground" />
                              <span>{t(item.name)}</span>
                           </Link>
                        </DropdownMenuItem>
                     ))}
                     {hidden.length > 0 && <DropdownMenuSeparator />}
                     <DropdownMenuItem onClick={() => setCustomizeOpen(true)}>
                        <LayoutList className="text-muted-foreground" />
                        <span>{t('Customize sidebar')}</span>
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </SidebarMenuItem>
         </SidebarMenu>
         <CustomizeSidebarDialog open={customizeOpen} onOpenChange={setCustomizeOpen} />
      </SidebarGroup>
   );
}
