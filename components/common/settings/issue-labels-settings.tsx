'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LabelDialog } from '@/components/common/forms/label-dialog';
import type { LabelInterface } from '@/mock-data/labels';
import { useIssuesStore } from '@/store/issues-store';
import { useLabelsStore } from '@/store/labels-store';
import { MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SelectMenu } from './shared';

/** Invented descriptions for a few labels (Linear shows a Description column). */
const DESCRIPTIONS: Record<string, string> = {
   bug: 'Something is broken and needs a fix',
   accessibility: 'Keyboard, focus and screen-reader work',
   performance: 'Speed, memory and bundle size work',
};

const hashString = (value: string): number => {
   let hash = 0;
   for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
   return hash;
};

const LAST_APPLIED = [
   '12 minutes ago',
   '41 minutes ago',
   '3 hours ago',
   '17 hours ago',
   '2 days ago',
   '6 days ago',
];
const CREATED = ['Sep 2023', 'Jan 2024', 'Jun 2024', 'Feb 2025', 'Jun 2025', 'Jul 12'];

const formatCount = (count: number) =>
   count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count);

/** Workspace "Issue labels" settings: filterable table of every label. */
export default function IssueLabelsSettings() {
   const issues = useIssuesStore((s) => s.issues);
   const labels = useLabelsStore((s) => s.labels);
   const deleteLabel = useLabelsStore((s) => s.deleteLabel);
   const [query, setQuery] = useState('');
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editing, setEditing] = useState<LabelInterface | undefined>(undefined);

   const openCreate = () => {
      setEditing(undefined);
      setDialogOpen(true);
   };
   const openEdit = (label: LabelInterface) => {
      setEditing(label);
      setDialogOpen(true);
   };

   const rows = useMemo(() => {
      const counts = new Map<string, number>();
      for (const issue of issues) {
         for (const label of issue.labels) {
            counts.set(label.id, (counts.get(label.id) ?? 0) + 1);
         }
      }
      return labels
         .map((label) => ({
            ...label,
            issues: counts.get(label.id) ?? 0,
            description: DESCRIPTIONS[label.id],
            lastApplied: LAST_APPLIED[hashString(label.id) % LAST_APPLIED.length],
            created: CREATED[hashString(label.name) % CREATED.length],
         }))
         .filter((label) => label.name.toLowerCase().includes(query.toLowerCase()))
         .sort((a, b) => a.name.localeCompare(b.name));
   }, [issues, labels, query]);

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-5xl mx-auto px-6 py-10 pb-20">
            <h1 className="text-2xl font-medium mb-6">Issue labels</h1>

            <div className="flex items-center justify-between gap-3 mb-6">
               <div className="flex items-center gap-2">
                  <Input
                     placeholder="Filter by name..."
                     value={query}
                     onChange={(event) => setQuery(event.target.value)}
                     className="w-64 h-8"
                  />
                  <SelectMenu options={['Workspace', 'All teams']} />
               </div>
               <div className="flex items-center gap-2">
                  <Button size="xs" onClick={openCreate}>
                     New label
                  </Button>
               </div>
            </div>

            {/* Header */}
            <div className="flex items-center px-2 py-1.5 text-xs text-muted-foreground border-b">
               <div className="flex-1 min-w-0">Name ↓</div>
               <div className="hidden md:block w-[260px]">Description</div>
               <div className="w-[70px]">Issues</div>
               <div className="hidden sm:block w-[110px]">Last applied</div>
               <div className="w-[80px]">Created</div>
            </div>

            {rows.map((label) => (
               <div
                  key={label.id}
                  className="flex items-center px-2 py-2.5 text-sm border-b border-muted-foreground/5 hover:bg-sidebar/50"
               >
                  <div className="flex-1 min-w-0 flex items-center gap-2.5">
                     <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: label.color }}
                     />
                     <span className="truncate">{label.name}</span>
                  </div>
                  <div className="hidden md:block w-[260px] text-xs text-muted-foreground truncate pr-4">
                     {label.description}
                  </div>
                  <div className="w-[70px] text-xs text-muted-foreground">
                     {label.issues > 0 && formatCount(label.issues)}
                  </div>
                  <div className="hidden sm:block w-[110px] text-xs text-muted-foreground">
                     {label.issues > 0 && label.lastApplied}
                  </div>
                  <div className="w-[80px] text-xs text-muted-foreground">{label.created}</div>
                  <DropdownMenu>
                     <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground shrink-0">
                        <MoreHorizontal className="size-4" />
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(label)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                           className="text-destructive"
                           onClick={() => deleteLabel(label.id)}
                        >
                           Delete
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            ))}
            {rows.length === 0 && (
               <p className="text-sm text-muted-foreground py-6">No labels match your filter.</p>
            )}
         </div>

         <LabelDialog open={dialogOpen} onOpenChange={setDialogOpen} label={editing} />
      </div>
   );
}
