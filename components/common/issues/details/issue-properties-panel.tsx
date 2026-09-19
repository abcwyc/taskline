'use client';

import { CyclePlayIcon } from '@/components/common/cycles/cycle-line';
import { AssigneeUser } from '../assignee-user';
import { LabelBadge } from '../label-badge';
import { PrioritySelector } from '../priority-selector';
import { StatusSelector } from '../status-selector';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { IssueDetail, RelationEntry } from '@/mock-data/issue-details';
import { Issue } from '@/mock-data/issues';
import { useCyclesStore } from '@/store/cycles-store';
import { useIssueDetailsStore } from '@/store/issue-details-store';
import { ArrowUpRight, Ban, GitPullRequestArrow, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { IssueRefRow } from './content-blocks';

interface IssuePropertiesPanelProps {
   issue: Issue;
   detail: IssueDetail;
}

const RELATION_TYPES: { value: RelationEntry['type']; label: string }[] = [
   { value: 'blocked-by', label: 'Blocked by' },
   { value: 'blocks', label: 'Blocks' },
   { value: 'related', label: 'Related' },
   { value: 'duplicate', label: 'Duplicate' },
];

/** Resolves the relation id backing a row, matching target + one of the section's types. */
function findRelationId(
   entries: RelationEntry[] | undefined,
   identifier: string,
   types: RelationEntry['type'][]
): string | undefined {
   return entries?.find((r) => r.targetIdentifier === identifier && types.includes(r.type))?.id;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
   return (
      <div>
         <h3 className="text-xs font-medium text-muted-foreground mb-2">{title}</h3>
         {children}
      </div>
   );
}

function RelationRow({
   identifier,
   relationId,
   onRemove,
   icon,
}: {
   identifier: string;
   relationId: string | undefined;
   onRemove: (relationId: string) => void;
   icon?: React.ReactNode;
}) {
   return (
      <div className="group/rel flex items-center gap-1.5 min-w-0">
         {icon}
         <div className="min-w-0 flex-1">
            <IssueRefRow identifier={identifier} />
         </div>
         {relationId && (
            <button
               type="button"
               aria-label={`Remove relation to ${identifier}`}
               onClick={() => onRemove(relationId)}
               className="shrink-0 p-0.5 text-muted-foreground/70 hover:text-foreground opacity-0 group-hover/rel:opacity-100 transition-opacity"
            >
               <X className="size-3.5" />
            </button>
         )}
      </div>
   );
}

/** "+" affordance under the relations area: target identifier + type, persisted on Add. */
function AddRelationPopover({
   issueIdentifier,
   onAdd,
}: {
   issueIdentifier: string;
   onAdd: (identifier: string, relatedId: string, type: RelationEntry['type']) => Promise<boolean>;
}) {
   const [open, setOpen] = useState(false);
   const [target, setTarget] = useState('');
   const [type, setType] = useState<RelationEntry['type']>('blocked-by');

   const close = () => {
      setOpen(false);
      setTarget('');
   };

   const submit = async () => {
      const identifier = target.trim();
      if (!identifier) return;
      // Close immediately and fire async — reopening on failure is worse than
      // the toast the store already shows, and this avoids the radix Presence
      // exit-animation race when a store re-render lands mid-submit.
      close();
      await onAdd(issueIdentifier, identifier, type);
   };

   return (
      <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
         <PopoverTrigger asChild>
            <button
               type="button"
               className="flex items-center gap-1.5 -ml-1 text-xs text-muted-foreground hover:text-foreground"
            >
               <Plus className="size-3.5" />
               Add relation
            </button>
         </PopoverTrigger>
         <PopoverContent align="start" className="w-64">
            <div className="flex flex-col gap-3">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="relation-target" className="text-xs">
                     Issue
                  </Label>
                  <Input
                     id="relation-target"
                     value={target}
                     onChange={(event) => setTarget(event.target.value)}
                     onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                           event.preventDefault();
                           void submit();
                        }
                     }}
                     placeholder="LNUI-701"
                     className="h-7 text-xs"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select
                     value={type}
                     onValueChange={(value) => setType(value as RelationEntry['type'])}
                  >
                     <SelectTrigger className="h-7 w-full text-xs">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        {RELATION_TYPES.map((option) => (
                           <SelectItem key={option.value} value={option.value} className="text-xs">
                              {option.label}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
               <Button
                  size="xs"
                  onClick={() => void submit()}
                  disabled={!target.trim()}
                  className="self-start"
               >
                  Add
               </Button>
            </div>
         </PopoverContent>
      </Popover>
   );
}

/** "+ Add PR" affordance in the Diffs section: title + URL, persisted on Add. */
function AddPullRequestDialog({
   issueIdentifier,
   onAdd,
}: {
   issueIdentifier: string;
   onAdd: (identifier: string, title: string, url: string) => Promise<boolean>;
}) {
   const [open, setOpen] = useState(false);
   const [title, setTitle] = useState('');
   const [url, setUrl] = useState('');

   const urlInvalid = url.trim().length > 0 && !url.trim().startsWith('http');
   const canSubmit = title.trim().length > 0 && url.trim().startsWith('http');

   const close = () => {
      setOpen(false);
      setTitle('');
      setUrl('');
   };

   const submit = async () => {
      if (!canSubmit) return;
      // Same rationale as AddRelationPopover: close first, let the store's
      // toast carry any failure.
      const nextTitle = title.trim();
      const nextUrl = url.trim();
      close();
      await onAdd(issueIdentifier, nextTitle, nextUrl);
   };

   return (
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
         <DialogTrigger asChild>
            <button
               type="button"
               className="flex items-center gap-1.5 -ml-1 mt-1 text-xs text-muted-foreground hover:text-foreground"
            >
               <Plus className="size-3.5" />
               Add pull request
            </button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>Link a pull request</DialogTitle>
               <DialogDescription>
                  Add a pull request shown in the Diffs section of this issue.
               </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pr-title" className="text-xs">
                     Title
                  </Label>
                  <Input
                     id="pr-title"
                     value={title}
                     onChange={(event) => setTitle(event.target.value)}
                     placeholder="fix(dialog): portal-aware focus containment"
                     className="h-7 text-xs"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pr-url" className="text-xs">
                     URL
                  </Label>
                  <Input
                     id="pr-url"
                     value={url}
                     onChange={(event) => setUrl(event.target.value)}
                     placeholder="https://github.com/lndev/ui/pull/212"
                     className="h-7 text-xs"
                  />
                  {urlInvalid && <p className="text-xs text-red-500">URL must start with http.</p>}
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" size="xs" onClick={close}>
                  Cancel
               </Button>
               <Button size="xs" onClick={() => void submit()} disabled={!canSubmit}>
                  Add
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

/**
 * Right sidebar of the issue page: editable properties (status, priority,
 * assignee), cycle, labels, project + milestone, relations and linked PRs.
 */
export function IssuePropertiesPanel({ issue, detail }: IssuePropertiesPanelProps) {
   const cycle = useCyclesStore((s) => (issue.cycleId ? s.getCycleById(issue.cycleId) : undefined));
   const addRelation = useIssueDetailsStore((s) => s.addRelation);
   const removeRelation = useIssueDetailsStore((s) => s.removeRelation);
   const addPullRequest = useIssueDetailsStore((s) => s.addPullRequest);
   const removePullRequest = useIssueDetailsStore((s) => s.removePullRequest);

   return (
      <div className="flex flex-col gap-7">
         <Section title="Properties">
            <div className="flex flex-col gap-1.5">
               <div className="flex items-center gap-1.5 -ml-1.5">
                  <StatusSelector status={issue.status} issueId={issue.id} />
                  <span className="text-sm">{issue.status.name}</span>
               </div>
               <div className="flex items-center gap-1.5 -ml-1.5">
                  <PrioritySelector priority={issue.priority} issueId={issue.id} />
                  <span className="text-sm">{issue.priority.name}</span>
               </div>
               <div className="flex items-center gap-2 mt-0.5">
                  <AssigneeUser user={issue.assignee} />
                  <span className="text-sm">{issue.assignee ? issue.assignee.name : 'Assign'}</span>
               </div>
               {cycle && (
                  <div className="flex items-center gap-2 mt-0.5">
                     <CyclePlayIcon className="size-4" />
                     <span className="text-sm">{cycle.name}</span>
                  </div>
               )}
            </div>
         </Section>

         <Section title="Labels">
            <div className="flex items-center flex-wrap gap-1.5">
               <LabelBadge label={issue.labels} />
               <Button variant="ghost" size="icon" className="size-6 rounded-full border">
                  <Plus className="size-3.5" />
               </Button>
            </div>
         </Section>

         {issue.project && (
            <Section title="Project">
               <div className="flex items-center gap-2 text-sm">
                  <issue.project.icon className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{issue.project.name}</span>
               </div>
               {detail.milestone && (
                  <div className="flex items-center gap-2 text-sm mt-1.5 pl-6 text-muted-foreground">
                     <span className="size-2 rotate-45 border border-amber-400 shrink-0" />
                     <span className="truncate">{detail.milestone}</span>
                  </div>
               )}
            </Section>
         )}

         {detail.blockedByIds && detail.blockedByIds.length > 0 && (
            <Section title="Blocked by">
               <div className="flex flex-col">
                  {detail.blockedByIds.map((identifier) => (
                     <RelationRow
                        key={identifier}
                        identifier={identifier}
                        relationId={findRelationId(detail.relationEntries, identifier, [
                           'blocked-by',
                        ])}
                        onRemove={(relationId) => removeRelation(issue.identifier, relationId)}
                        icon={<Ban className="size-3.5 text-red-500 shrink-0" />}
                     />
                  ))}
               </div>
            </Section>
         )}

         {detail.blocksIds && detail.blocksIds.length > 0 && (
            <Section title="Blocks">
               <div className="flex flex-col">
                  {detail.blocksIds.map((identifier) => (
                     <RelationRow
                        key={identifier}
                        identifier={identifier}
                        relationId={findRelationId(detail.relationEntries, identifier, ['blocks'])}
                        onRemove={(relationId) => removeRelation(issue.identifier, relationId)}
                        icon={<ArrowUpRight className="size-3.5 text-red-500 shrink-0" />}
                     />
                  ))}
               </div>
            </Section>
         )}

         {detail.relatedIds && detail.relatedIds.length > 0 && (
            <Section title="Related">
               <div className="flex flex-col">
                  {detail.relatedIds.map((identifier) => (
                     <RelationRow
                        key={identifier}
                        identifier={identifier}
                        relationId={findRelationId(detail.relationEntries, identifier, [
                           'related',
                           'duplicate',
                        ])}
                        onRemove={(relationId) => removeRelation(issue.identifier, relationId)}
                     />
                  ))}
               </div>
            </Section>
         )}

         <AddRelationPopover issueIdentifier={issue.identifier} onAdd={addRelation} />

         <Section title="Diffs">
            <div className="flex flex-col gap-1">
               {(detail.prLinks ?? []).map((pr) => (
                  <div key={pr.id} className="group/pr flex items-center gap-2 text-sm min-w-0">
                     {pr.url ? (
                        <a
                           href={pr.url}
                           target="_blank"
                           rel="noreferrer"
                           className="flex items-center gap-2 min-w-0 flex-1 hover:underline underline-offset-2"
                        >
                           <GitPullRequestArrow
                              className={
                                 'size-3.5 shrink-0 ' +
                                 (pr.status === 'merged' ? 'text-purple-400' : 'text-green-500')
                              }
                           />
                           <span className="text-muted-foreground shrink-0">{pr.id}</span>
                           <span className="truncate">{pr.title}</span>
                           <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                              {pr.status}
                           </span>
                        </a>
                     ) : (
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                           <GitPullRequestArrow
                              className={
                                 'size-3.5 shrink-0 ' +
                                 (pr.status === 'merged' ? 'text-purple-400' : 'text-green-500')
                              }
                           />
                           <span className="text-muted-foreground shrink-0">{pr.id}</span>
                           <span className="truncate">{pr.title}</span>
                           <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                              {pr.status}
                           </span>
                        </div>
                     )}
                     <button
                        type="button"
                        aria-label={`Unlink pull request ${pr.id}`}
                        onClick={() => removePullRequest(issue.identifier, pr.id)}
                        className="shrink-0 p-0.5 text-muted-foreground/70 hover:text-foreground opacity-0 group-hover/pr:opacity-100 transition-opacity"
                     >
                        <X className="size-3.5" />
                     </button>
                  </div>
               ))}
               <AddPullRequestDialog issueIdentifier={issue.identifier} onAdd={addPullRequest} />
            </div>
         </Section>
      </div>
   );
}
