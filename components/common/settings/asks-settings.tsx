'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createAsk, fetchMyAsks } from '@/lib/api/asks';
import { TriageItemDTO } from '@/lib/api/types';
import { useTeamsStore } from '@/store/teams-store';
import { isValid, parseISO } from 'date-fns';
import { Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SettingsCard, SettingsSection } from './shared';
import { formatAppDate, type AppLocale } from '@/lib/i18n';
import { useLanguage } from '@/components/providers/language-provider';

const formatDate = (iso: string, locale: AppLocale) => {
   const date = parseISO(iso);
   return isValid(date) ? formatAppDate(locale, date, 'MMM d, yyyy') : iso;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
   pending: { label: 'Pending', className: 'text-muted-foreground' },
   accepted: { label: 'Accepted', className: 'text-[#4cb782]' },
   declined: { label: 'Declined', className: 'text-muted-foreground' },
   snoozed: { label: 'Snoozed', className: 'text-amber-600 dark:text-amber-400' },
};

function AskStatusBadge({ status }: { status: string }) {
   const { t } = useLanguage();
   const meta = STATUS_META[status] ?? STATUS_META.pending;
   return (
      <Badge variant="outline" className={`px-1.5 py-0 text-[11px] ${meta.className}`}>
         {t(meta.label)}
      </Badge>
   );
}

/** Workspace "Asks" settings: submit a request into a team intake queue and
 *  follow the requests you've submitted. */
export default function AsksSettings() {
   const { locale, t } = useLanguage();
   const teams = useTeamsStore((s) => s.teams);
   const hydrateTeams = useTeamsStore((s) => s.hydrate);

   const [title, setTitle] = useState('');
   const [description, setDescription] = useState('');
   const [teamId, setTeamId] = useState<string>('');
   const [submitting, setSubmitting] = useState(false);

   const [asks, setAsks] = useState<TriageItemDTO[] | null>(null);
   const [loadingError, setLoadingError] = useState<string | null>(null);

   const refresh = useCallback(async () => {
      try {
         setAsks(await fetchMyAsks());
         setLoadingError(null);
      } catch (err) {
         setLoadingError((err as Error).message);
      }
   }, []);

   useEffect(() => {
      void hydrateTeams().catch(() => undefined);
      void refresh();
   }, [hydrateTeams, refresh]);

   // Default the team select to the first team once teams land.
   useEffect(() => {
      if (!teamId && teams.length > 0) setTeamId(teams[0].id);
   }, [teams, teamId]);

   const submit = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!teamId || !title.trim() || submitting) return;
      setSubmitting(true);
      try {
         const created = await createAsk({
            title: title.trim(),
            description: description.trim(),
            teamId,
         });
         toast.success(t('Ask {id} submitted').replace('{id}', created.identifier));
         setTitle('');
         setDescription('');
         await refresh();
      } catch (err) {
         toast.error(t('Failed to submit ask'), {
            description: (err as Error).message,
         });
      } finally {
         setSubmitting(false);
      }
   };

   const teamName = (key: string) => teams.find((team) => team.id === key)?.name ?? key;

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-4xl mx-auto px-6 py-10 pb-20">
            <h1 className="text-2xl font-medium">{t('Asks')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
               {t(
                  "Turn requests into actionable issues. Submissions land in the team's intake queue for triage."
               )}
            </p>

            <div className="flex flex-col gap-10 mt-10">
               <SettingsSection title={t('Submit an ask')}>
                  <SettingsCard className="px-4 py-4">
                     <form onSubmit={submit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                           <Label htmlFor="ask-title" className="text-sm">
                              {t('Title')}
                           </Label>
                           <Input
                              id="ask-title"
                              value={title}
                              onChange={(event) => setTitle(event.target.value)}
                              placeholder={t('What are you asking for?')}
                              maxLength={300}
                              required
                           />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <Label htmlFor="ask-description" className="text-sm">
                              {t('Description')}
                           </Label>
                           <Textarea
                              id="ask-description"
                              value={description}
                              onChange={(event) => setDescription(event.target.value)}
                              placeholder={t('Add context, links or acceptance criteria…')}
                              rows={4}
                           />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <Label className="text-sm">{t('Team')}</Label>
                           <Select value={teamId} onValueChange={setTeamId}>
                              <SelectTrigger className="w-full sm:w-64">
                                 <SelectValue
                                    placeholder={
                                       teams.length === 0 ? t('No teams available') : t('Team')
                                    }
                                 />
                              </SelectTrigger>
                              <SelectContent>
                                 {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                       {team.name}
                                    </SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="flex items-center justify-end">
                           <Button
                              size="xs"
                              type="submit"
                              disabled={submitting || !title.trim() || !teamId}
                           >
                              <Send className="size-3.5" />
                              {submitting ? t('Submitting…') : t('Submit')}
                           </Button>
                        </div>
                     </form>
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection
                  title={t('My asks')}
                  description={t("Requests you've submitted, in any state")}
               >
                  {loadingError && <p className="text-sm text-destructive">{loadingError}</p>}
                  {asks === null && !loadingError && (
                     <p className="text-sm text-muted-foreground">{t('Loading your asks…')}</p>
                  )}
                  {asks !== null && (
                     <div className="rounded-lg border bg-container">
                        <div className="flex items-center px-4 py-2 text-xs text-muted-foreground border-b">
                           <span className="w-20 shrink-0">{t('Request')}</span>
                           <span className="flex-1 min-w-0">{t('Title')}</span>
                           <span className="hidden sm:block w-28 shrink-0">{t('Team')}</span>
                           <span className="hidden md:block w-28 shrink-0">{t('Submitted')}</span>
                           <span className="w-24 shrink-0 text-right">{t('Status')}</span>
                        </div>
                        {asks.map((ask) => (
                           <div
                              key={ask.id}
                              className="flex items-center px-4 py-2.5 text-sm border-b border-border/40 last:border-b-0"
                           >
                              <span className="w-20 shrink-0 font-medium font-mono text-xs">
                                 {ask.identifier}
                              </span>
                              <span className="flex-1 min-w-0 truncate pr-4" title={ask.title}>
                                 {ask.title}
                              </span>
                              <span className="hidden sm:block w-28 shrink-0 text-xs text-muted-foreground truncate">
                                 {teamName(ask.teamId)}
                              </span>
                              <span className="hidden md:block w-28 shrink-0 text-xs text-muted-foreground">
                                 {formatDate(ask.receivedAt, locale)}
                              </span>
                              <span className="w-24 shrink-0 flex justify-end">
                                 <AskStatusBadge status={ask.status} />
                              </span>
                           </div>
                        ))}
                        {asks.length === 0 && (
                           <p className="text-sm text-muted-foreground px-4 py-6">
                              {t("You haven't submitted any asks yet.")}
                           </p>
                        )}
                     </div>
                  )}
               </SettingsSection>
            </div>
         </div>
      </div>
   );
}
