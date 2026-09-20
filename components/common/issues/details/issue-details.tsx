'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { useIssuesStore } from '@/store/issues-store';
import { useIssueDetail, useIssueDetailsStore } from '@/store/issue-details-store';
import type { Issue } from '@/mock-data/issues';
import type { ContentBlock } from '@/mock-data/issue-details';
import { Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { AssigneeUser } from '../assignee-user';
import { ActivityFeed } from './activity-feed';
import { AttachmentsSection } from './attachments-section';
import { ContentBlocks } from './content-blocks';
import { IssuePropertiesPanel } from './issue-properties-panel';

/**
 * Issue detail page: rich description, sub-issues, activity feed and a
 * properties sidebar — Linear-style.
 */

const EDITABLE_TEXTUAL = new Set(['paragraph', 'heading', 'quote']);

/** Render description blocks into editable plain text (markdown-lite). */
function blocksToEditText(blocks: ContentBlock[]): string {
   const parts: string[] = [];
   for (const block of blocks) {
      switch (block.type) {
         case 'heading':
            parts.push(`${block.level === 1 ? '#' : '##'} ${block.text}`);
            break;
         case 'paragraph':
            parts.push(block.text);
            break;
         case 'quote':
            parts.push(`> ${block.text}`);
            break;
         case 'bullet-list':
            parts.push(block.items.map((item) => `- ${item}`).join('\n'));
            break;
         case 'numbered-list':
            parts.push(block.items.map((item, index) => `${index + 1}. ${item}`).join('\n'));
            break;
         case 'checklist':
            parts.push(
               block.items.map((item) => `${item.checked ? '[x]' : '[ ]'} ${item.text}`).join('\n')
            );
            break;
         case 'code':
            parts.push('```' + block.language + '\n' + block.code + '\n```');
            break;
         case 'issue-ref':
            parts.push(block.note ? `${block.identifier} — ${block.note}` : block.identifier);
            break;
         default:
            break;
      }
   }
   return parts.join('\n\n');
}

function TitleEditor({ issue }: { issue: Issue }) {
   const { t } = useLanguage();
   const updateIssue = useIssuesStore((s) => s.updateIssue);
   const refreshDetail = useIssueDetailsStore((s) => s.refreshDetail);
   const [editing, setEditing] = useState(false);
   const [draft, setDraft] = useState(issue.title);
   const inputRef = useRef<HTMLInputElement>(null);
   const activeRef = useRef(false);

   const start = () => {
      setDraft(issue.title);
      activeRef.current = true;
      setEditing(true);
      requestAnimationFrame(() => {
         inputRef.current?.focus();
         inputRef.current?.select();
      });
   };

   const cancel = () => {
      activeRef.current = false;
      setEditing(false);
   };

   const save = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setEditing(false);
      const next = draft.trim();
      if (!next || next === issue.title) return;
      void updateIssue(issue.id, { title: next }).then(() => refreshDetail(issue.identifier));
   };

   if (editing) {
      return (
         <div>
            <input
               ref={inputRef}
               value={draft}
               maxLength={300}
               onChange={(event) => setDraft(event.target.value)}
               onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                     event.preventDefault();
                     save();
                  } else if (event.key === 'Escape') {
                     event.preventDefault();
                     cancel();
                  }
               }}
               onBlur={save}
               className="w-full text-3xl font-semibold leading-tight bg-transparent border border-border rounded-md px-3 py-2 outline-none focus:border-ring"
            />
            <p className="mt-2 text-xs text-muted-foreground">
               {t('Enter to save, Esc to cancel')}
            </p>
         </div>
      );
   }

   return (
      <div className="group/title relative min-w-0">
         <h1
            onDoubleClick={start}
            className="text-3xl font-semibold leading-tight text-balance pr-8"
         >
            {issue.title}
         </h1>
         <button
            onClick={start}
            aria-label={t('Edit title')}
            title={t('Edit title')}
            className="absolute right-0 top-1.5 opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
         >
            <Pencil className="size-4" />
         </button>
      </div>
   );
}

function DescriptionEditor({
   issue,
   detail,
}: {
   issue: Issue;
   detail: { description: ContentBlock[] };
}) {
   const { t } = useLanguage();
   const updateIssue = useIssuesStore((s) => s.updateIssue);
   const refreshDetail = useIssueDetailsStore((s) => s.refreshDetail);
   const [editing, setEditing] = useState(false);
   const [draft, setDraft] = useState('');
   const hasRich = detail.description.some((block) => !EDITABLE_TEXTUAL.has(block.type));
   const isEmpty = detail.description.length === 0;

   const start = () => {
      setDraft(blocksToEditText(detail.description));
      setEditing(true);
   };

   const cancel = () => setEditing(false);

   const save = () => {
      setEditing(false);
      const next = draft.trim();
      if (next === blocksToEditText(detail.description).trim()) return;
      void updateIssue(issue.id, { description: next }).then(() => refreshDetail(issue.identifier));
   };

   if (editing) {
      return (
         <div className="mt-6">
            <Textarea
               autoFocus
               value={draft}
               onChange={(event) => setDraft(event.target.value)}
               onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                     event.preventDefault();
                     cancel();
                  }
               }}
               placeholder={t('Add description…')}
               className="min-h-48 text-sm"
            />
            {hasRich && (
               <p className="mt-2 text-xs text-muted-foreground">
                  {t('Rich content such as lists, code and images is saved as plain text.')}
               </p>
            )}
            <div className="mt-3 flex items-center gap-2">
               <Button size="sm" onClick={save}>
                  {t('Save')}
               </Button>
               <Button size="sm" variant="ghost" onClick={cancel}>
                  {t('Cancel')}
               </Button>
               <span className="text-xs text-muted-foreground ml-1">Esc — {t('Cancel')}</span>
            </div>
         </div>
      );
   }

   return (
      <div className="group/desc relative mt-6">
         {isEmpty ? (
            <button
               onClick={start}
               className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
               <Pencil className="size-3.5" />
               {t('Add description…')}
            </button>
         ) : (
            <>
               <ContentBlocks blocks={detail.description} />
               <button
                  onClick={start}
                  aria-label={t('Edit description')}
                  title={t('Edit description')}
                  className="absolute right-0 top-0 opacity-0 group-hover/desc:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
               >
                  <Pencil className="size-4" />
               </button>
            </>
         )}
      </div>
   );
}

export default function IssueDetails() {
   const { orgId, issueId } = useParams<{ orgId: string; issueId: string }>();
   const { t } = useLanguage();
   const { issues } = useIssuesStore();
   const openCreateIssue = useCreateIssueStore((s) => s.openModal);

   const issue = useMemo(
      () => issues.find((candidate) => candidate.identifier === issueId),
      [issues, issueId]
   );

   const detail = useIssueDetail(issue);

   if (!issue || !detail) {
      return (
         <div className="flex flex-col items-center justify-center h-full gap-2 text-sm text-muted-foreground">
            <p>
               {t('Issue')} {issueId} {t('not found.')}
            </p>
            <Link href={`/${orgId ?? 'lndev-ui'}/my-issues`} className="underline">
               {t('Back to issues')}
            </Link>
         </div>
      );
   }

   const subIssues = (detail.subIssueIds ?? [])
      .map((identifier) => issues.find((candidate) => candidate.identifier === identifier))
      .filter((candidate) => candidate !== undefined);

   return (
      <div className="w-full h-full flex overflow-hidden">
         {/* Main column */}
         <div className="flex-1 min-w-0 h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-10">
               <TitleEditor issue={issue} />

               <DescriptionEditor issue={issue} detail={detail} />

               <AttachmentsSection issueIdentifier={issue.identifier} />

               {/* Sub-issues */}
               <div className="mt-8">
                  {subIssues.length > 0 ? (
                     <>
                        <div className="flex items-center justify-between mb-1">
                           <h2 className="text-sm font-medium">
                              {t('Sub-issues')}{' '}
                              <span className="text-muted-foreground">
                                 {
                                    subIssues.filter(
                                       (subIssue) => subIssue.status.category === 'completed'
                                    ).length
                                 }
                                 /{subIssues.length}
                              </span>
                           </h2>
                           <button
                              onClick={() => openCreateIssue({ parentIssue: issue })}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={t('Add sub-issue')}
                           >
                              <Plus className="size-4" />
                           </button>
                        </div>
                        <div className="flex flex-col border-t border-border/50">
                           {subIssues.map((subIssue) => (
                              <Link
                                 key={subIssue.id}
                                 href={`/${orgId ?? 'lndev-ui'}/issue/${subIssue.identifier}`}
                                 className="flex items-center gap-2.5 h-10 px-1 border-b border-border/50 hover:bg-sidebar/50 text-sm min-w-0"
                              >
                                 <subIssue.status.icon />
                                 <span className="text-muted-foreground shrink-0 text-xs font-medium">
                                    {subIssue.identifier}
                                 </span>
                                 <span className="truncate font-medium">{subIssue.title}</span>
                                 <span className="ml-auto shrink-0">
                                    <AssigneeUser user={subIssue.assignee} />
                                 </span>
                              </Link>
                           ))}
                        </div>
                     </>
                  ) : (
                     <button
                        onClick={() => openCreateIssue({ parentIssue: issue })}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                     >
                        <Plus className="size-4" />
                        {t('Add sub-issues')}
                     </button>
                  )}
               </div>

               <div className="border-t border-border/60 mt-8" />

               <ActivityFeed activity={detail.activity} issueIdentifier={issue.identifier} />
            </div>
         </div>

         {/* Properties sidebar */}
         <aside className="hidden lg:block w-80 shrink-0 border-l h-full overflow-y-auto bg-container px-5 py-6">
            <IssuePropertiesPanel issue={issue} detail={detail} />
         </aside>
      </div>
   );
}
