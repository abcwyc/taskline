'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchSlas, putSetting, type SlaPolicy } from '@/lib/api/workspace-settings';
import type { Issue } from '@/mock-data/issues';
import { priorities } from '@/mock-data/priorities';
import { useIssuesStore } from '@/store/issues-store';
import { useMeStore } from '@/store/me-store';
import { formatRelativeTime } from '@/lib/i18n';
import { apiErrorMessage, SettingsCard, SettingsSection, SettingsStatCard } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

/** Server defaults, used until the stored document arrives (and as a fallback). */
const DEFAULT_SLAS: SlaPolicy[] = [
   { priority: 'urgent', respondHours: 4, resolveHours: 24 },
   { priority: 'high', respondHours: 12, resolveHours: 72 },
   { priority: 'medium', respondHours: 24, resolveHours: 168 },
   { priority: 'low', respondHours: 72, resolveHours: 336 },
];

const PRIORITY_IDS: SlaPolicy['priority'][] = ['urgent', 'high', 'medium', 'low'];

type PriorityId = SlaPolicy['priority'];

/** Editable draft row — inputs are allowed to be cleared while editing. */
interface DraftSla {
   priority: PriorityId;
   respondHours: number | '';
   resolveHours: number | '';
}

const isOpen = (issue: Issue) =>
   issue.status.category !== 'completed' && issue.status.category !== 'canceled';

/** Workspace "SLAs" settings: policy editor (admin) + live breach monitor (everyone). */
export default function SlasSettings() {
   const { locale, t } = useLanguage();
   const { orgId } = useParams<{ orgId: string }>();
   const isAdmin = useMeStore((s) => s.me?.role === 'Admin');
   const issues = useIssuesStore((s) => s.issues);

   const [saved, setSaved] = useState<SlaPolicy[]>(DEFAULT_SLAS);
   const [draft, setDraft] = useState<DraftSla[]>(DEFAULT_SLAS.map(toDraft));
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      let active = true;
      fetchSlas()
         .then((rows) => {
            if (!active) return;
            const merged = PRIORITY_IDS.map(
               (priority) =>
                  rows.find((row) => row.priority === priority) ??
                  DEFAULT_SLAS.find((row) => row.priority === priority)!
            );
            setSaved(merged);
            setDraft(merged.map(toDraft));
         })
         .catch((err) => console.error(err));
      return () => {
         active = false;
      };
   }, []);

   const updateDraft = (
      priority: PriorityId,
      field: 'respondHours' | 'resolveHours',
      value: string
   ) => {
      setDraft((rows) =>
         rows.map((row) =>
            row.priority === priority
               ? { ...row, [field]: value === '' ? '' : Math.floor(Number(value)) }
               : row
         )
      );
   };

   const handleSave = async () => {
      const rows: SlaPolicy[] = [];
      for (const row of draft) {
         const respond = row.respondHours;
         const resolve = row.resolveHours;
         if (
            typeof respond !== 'number' ||
            typeof resolve !== 'number' ||
            !Number.isInteger(respond) ||
            !Number.isInteger(resolve) ||
            respond < 1 ||
            respond > 2_000 ||
            resolve < 1 ||
            resolve > 10_000
         ) {
            toast.error(t('Hours must be whole numbers (respond 1–2000, resolve 1–10000).'));
            return;
         }
         rows.push({ priority: row.priority, respondHours: respond, resolveHours: resolve });
      }
      setSaving(true);
      try {
         await putSetting('slas', rows);
         setSaved(rows);
         setDraft(rows.map(toDraft));
         toast.success(t('SLAs saved'));
      } catch (err) {
         toast.error(apiErrorMessage(err, t('Failed to save SLAs')));
         console.error(err);
      } finally {
         setSaving(false);
      }
   };

   /* Live monitor: open issues older than each priority's resolve target. */
   const monitor = useMemo(() => {
      const now = Date.now();
      const resolveByPriority = new Map(saved.map((row) => [row.priority, row.resolveHours]));
      const open = issues.filter(isOpen);
      const isBreached = (issue: Issue) => {
         const target = resolveByPriority.get(issue.priority.id as PriorityId);
         return (
            target !== undefined && now - new Date(issue.createdAt).getTime() > target * 3_600_000
         );
      };
      const breached = open.filter(isBreached);
      const byPriority = PRIORITY_IDS.map((priority) => {
         const ofPriority = open.filter((i) => i.priority.id === priority);
         return {
            priority,
            open: ofPriority.length,
            breached: ofPriority.filter(isBreached).length,
         };
      });
      const worst = [...breached]
         .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
         .slice(0, 5)
         .map((issue) => ({
            issue,
            days: Math.max(1, Math.floor((now - new Date(issue.createdAt).getTime()) / 86_400_000)),
         }));
      return { byPriority, worst, totalBreached: breached.length };
   }, [issues, saved]);

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-3xl mx-auto px-6 py-10 pb-20">
            <h1 className="text-2xl font-medium">{t('SLAs')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
               {t('Automatically apply deadlines to issues based on their priority.')}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
               {monitor.byPriority.map(({ priority, open, breached }) => {
                  const meta = priorities.find((p) => p.id === priority);
                  return (
                     <SettingsStatCard
                        key={priority}
                        label={t(meta?.name ?? priority)}
                        value={open}
                        detail={`${breached} ${t('breached')}`}
                        detailClassName={breached > 0 ? 'text-red-500' : undefined}
                     />
                  );
               })}
            </div>

            <div className="flex flex-col gap-10 mt-10">
               <SettingsSection
                  title={t('Policies')}
                  description={t('Response and resolution targets, in hours, per priority.')}
                  action={
                     isAdmin ? (
                        <Button size="xs" onClick={handleSave} disabled={saving}>
                           {saving ? t('Saving…') : t('Save')}
                        </Button>
                     ) : undefined
                  }
               >
                  <SettingsCard>
                     <div className="flex items-center px-4 py-2 text-xs text-muted-foreground">
                        <div className="flex-1">{t('Priority')}</div>
                        <div className="w-32">{t('Respond within')}</div>
                        <div className="w-32">{t('Resolve within')}</div>
                     </div>
                     {draft.map((row) => {
                        const meta = priorities.find((p) => p.id === row.priority);
                        const Icon = meta?.icon;
                        return (
                           <div
                              key={row.priority}
                              className="flex items-center px-4 py-2.5 text-sm border-t border-border/60"
                           >
                              <div className="flex-1 flex items-center gap-2 capitalize">
                                 {Icon && <Icon className="size-3.5 text-muted-foreground" />}
                                 {t(meta?.name ?? row.priority)}
                              </div>
                              <div className="w-32">
                                 {isAdmin ? (
                                    <Input
                                       type="number"
                                       min={1}
                                       max={2000}
                                       className="h-8"
                                       value={row.respondHours}
                                       onChange={(e) =>
                                          updateDraft(row.priority, 'respondHours', e.target.value)
                                       }
                                    />
                                 ) : (
                                    <span className="text-muted-foreground">
                                       {row.respondHours}
                                       {t('h')}
                                    </span>
                                 )}
                              </div>
                              <div className="w-32">
                                 {isAdmin ? (
                                    <Input
                                       type="number"
                                       min={1}
                                       max={10000}
                                       className="h-8"
                                       value={row.resolveHours}
                                       onChange={(e) =>
                                          updateDraft(row.priority, 'resolveHours', e.target.value)
                                       }
                                    />
                                 ) : (
                                    <span className="text-muted-foreground">
                                       {row.resolveHours}
                                       {t('h')}
                                    </span>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </SettingsCard>
                  {!isAdmin && (
                     <p className="text-xs text-muted-foreground">
                        {t('Read-only — only workspace admins can edit SLA policies.')}
                     </p>
                  )}
               </SettingsSection>

               <SettingsSection
                  title={t('Resolution breaches')}
                  description={t(
                     'Open issues older than their resolve target ({count} total).'
                  ).replace('{count}', String(monitor.totalBreached))}
               >
                  <SettingsCard>
                     {monitor.worst.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">
                           {t('No resolution breaches — every open issue is within its target.')}
                        </p>
                     ) : (
                        monitor.worst.map(({ issue, days }) => (
                           <Link
                              key={issue.id}
                              href={`/${orgId}/issue/${issue.identifier}`}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/40 transition-colors border-t border-border/60 first:border-t-0"
                           >
                              <span className="text-xs text-muted-foreground shrink-0">
                                 {issue.identifier}
                              </span>
                              <span className="truncate">{issue.title}</span>
                              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                 {t('created')} {formatRelativeTime(locale, `${days}d ago`)}
                              </span>
                           </Link>
                        ))
                     )}
                  </SettingsCard>
               </SettingsSection>
            </div>
         </div>
      </div>
   );
}

function toDraft(row: SlaPolicy): DraftSla {
   return {
      priority: row.priority,
      respondHours: row.respondHours,
      resolveHours: row.resolveHours,
   };
}
