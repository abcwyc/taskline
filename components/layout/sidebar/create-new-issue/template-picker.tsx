'use client';

import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fetchIssueTemplates } from '@/lib/api/issue-templates';
import type { IssueTemplateDTO } from '@/lib/api/types';
import { LayoutTemplate } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/providers/language-provider';

/**
 * Template picker for the create-issue dialog. Selecting a template calls
 * `onPick(title, body)`; the caller decides whether to prefill (it only
 * fills fields that are still empty, never clobbering user input).
 */
export function TemplatePicker({ onPick }: { onPick: (title: string, body: string) => void }) {
   const { t } = useLanguage();
   const [templates, setTemplates] = useState<IssueTemplateDTO[] | null>(null);

   useEffect(() => {
      if (templates !== null) return;
      fetchIssueTemplates()
         .then(setTemplates)
         .catch((err) => {
            console.error(err);
            setTemplates([]);
         });
   }, [templates]);

   if (!templates || templates.length === 0) return null;

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button size="xs" variant="secondary" className="gap-1.5">
               <LayoutTemplate className="size-3.5" />
               {t('Template')}
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuLabel>{t('Issue templates')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {templates.map((template) => (
               <DropdownMenuItem
                  key={template.id}
                  onClick={() => onPick(template.title, template.body)}
                  className="gap-2"
               >
                  <span>{template.icon}</span>
                  <span className="truncate">{template.name}</span>
               </DropdownMenuItem>
            ))}
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
