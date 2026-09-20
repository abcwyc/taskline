'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { nextShortcutState, SHORTCUTS, ShortcutDef } from '@/lib/shortcuts';
import { useCreateIssueStore } from '@/store/create-issue-store';
import {
   Box,
   ClipboardList,
   Compass,
   ContactRound,
   FileText,
   GitBranch,
   Inbox,
   Keyboard,
   Layers,
   SquarePen,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/** Keys are shown as kbd chips, in the same style as the command palette hints. */
const SEQUENCE_ICONS: Record<string, React.ReactNode> = {
   'new-issue': <SquarePen className="size-4 text-muted-foreground" />,
   'inbox': <Inbox className="size-4 text-muted-foreground" />,
   'my-issues': <ClipboardList className="size-4 text-muted-foreground" />,
   'projects': <Box className="size-4 text-muted-foreground" />,
   'views': <Layers className="size-4 text-muted-foreground" />,
   'teams': <ContactRound className="size-4 text-muted-foreground" />,
   'reviews': <GitBranch className="size-4 text-muted-foreground" />,
   'agent': <Keyboard className="size-4 text-muted-foreground" />,
   'initiatives': <Compass className="size-4 text-muted-foreground" />,
   'settings': <FileText className="size-4 text-muted-foreground" />,
};

/** Typing targets and open Radix dialogs swallow shortcuts. */
function shouldIgnore(event: KeyboardEvent): boolean {
   if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return true;
   const target = event.target as HTMLElement | null;
   if (target) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
         return true;
      }
   }
   return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}

/** `?` help overlay listing every registered shortcut. */
function ShortcutsHelpDialog({
   open,
   onOpenChange,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
}) {
   const { t } = useLanguage();
   const groups: ShortcutDef['group'][] = ['goto', 'actions'];
   const groupHeading = { goto: t('Go to'), actions: t('Actions') };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent showCloseButton className="sm:max-w-md">
            <DialogTitle>{t('Keyboard shortcuts')}</DialogTitle>
            <DialogDescription className="sr-only">{t('Keyboard shortcuts')}</DialogDescription>
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
               {groups.map((group) => (
                  <div key={group}>
                     <h3 className="text-xs font-medium text-muted-foreground mb-2">
                        {groupHeading[group]}
                     </h3>
                     <div className="flex flex-col">
                        {SHORTCUTS.filter((def) => def.group === group).map((def) => (
                           <div
                              key={def.id}
                              className="flex items-center gap-2 py-1.5 text-sm border-b border-border/40 last:border-b-0"
                           >
                              {SEQUENCE_ICONS[def.id]}
                              <span className="flex-1">{t(def.label)}</span>
                              <span className="flex items-center gap-1">
                                 {def.sequence.map((key, index) => (
                                    <kbd
                                       key={index}
                                       className="min-w-5 h-5 px-1 inline-flex items-center justify-center rounded border bg-muted/50 text-[11px] text-muted-foreground font-sans uppercase"
                                    >
                                       {key}
                                    </kbd>
                                 ))}
                              </span>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         </DialogContent>
      </Dialog>
   );
}

/**
 * Workspace-wide hotkeys: `c` (new issue), `?` (help) and `g`-prefixed "go to"
 * chords. Mounted once next to the command palette; matches the hints the
 * palette already advertises.
 */
export function GlobalShortcuts() {
   const router = useRouter();
   const pathname = usePathname();
   const openModal = useCreateIssueStore((s) => s.openModal);
   const [helpOpen, setHelpOpen] = useState(false);
   const pendingRef = useRef<string[]>([]);
   const timerRef = useRef<number | undefined>(undefined);

   useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
         if (helpOpen || shouldIgnore(event)) return;
         if (event.key.length !== 1 && event.key !== '?') return;

         const { state, matched } = nextShortcutState(pendingRef.current, event.key);
         pendingRef.current = state;
         if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
         timerRef.current = window.setTimeout(() => (pendingRef.current = []), 1500);
         if (!matched) return;

         event.preventDefault();
         const orgId = pathname.split('/')[1];
         const goto = (path: string) => router.push(`/${orgId}${path}`);
         switch (matched.id) {
            case 'new-issue':
               openModal();
               break;
            case 'help':
               setHelpOpen(true);
               break;
            case 'inbox':
               goto('/inbox');
               break;
            case 'my-issues':
               goto('/my-issues');
               break;
            case 'projects':
               goto('/projects');
               break;
            case 'views':
               goto('/views');
               break;
            case 'teams':
               goto('/teams');
               break;
            case 'reviews':
               goto('/reviews');
               break;
            case 'agent':
               goto('/agent');
               break;
            case 'initiatives':
               goto('/initiatives');
               break;
            case 'settings':
               goto('/settings');
               break;
         }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => {
         window.removeEventListener('keydown', onKeyDown);
         if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
      };
   }, [helpOpen, openModal, pathname, router]);

   return <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />;
}
