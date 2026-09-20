'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { declineAsk, fetchCustomerRequests } from '@/lib/api/asks';
import { TriageItemDTO } from '@/lib/api/types';
import { useCanWrite } from '@/lib/hooks/use-current-user';
import { useMembersStore } from '@/store/members-store';
import { useTeamsStore } from '@/store/teams-store';
import { format, isValid, parseISO } from 'date-fns';
import { ExternalLink, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/components/providers/language-provider';

const formatDate = (iso: string) => {
   const date = parseISO(iso);
   return isValid(date) ? format(date, 'MMM d, yyyy') : iso;
};

/** First section body of a triage item — the submitter's description. */
function previewOf(item: TriageItemDTO): string {
   const sections = (item.sections as { heading: string; body: string }[]) ?? [];
   return sections[0]?.body?.trim() ?? '';
}

/** Workspace "Customer requests" settings: pending user-reported requests
 *  across every team's intake queue. */
export default function CustomerRequestsSettings() {
   const { orgId } = useParams<{ orgId: string }>();
   const teams = useTeamsStore((s) => s.teams);
   const hydrateTeams = useTeamsStore((s) => s.hydrate);
   const members = useMembersStore((s) => s.members);
   const canWrite = useCanWrite();

   const [requests, setRequests] = useState<TriageItemDTO[] | null>(null);
   const [loadingError, setLoadingError] = useState<string | null>(null);
   const [decliningId, setDecliningId] = useState<string | null>(null);
   const { t } = useLanguage();

   const refresh = useCallback(async () => {
      try {
         setRequests(await fetchCustomerRequests());
         setLoadingError(null);
      } catch (err) {
         setLoadingError((err as Error).message);
      }
   }, []);

   useEffect(() => {
      void hydrateTeams().catch(() => undefined);
      void refresh();
   }, [hydrateTeams, refresh]);

   const decline = async (id: string, identifier: string) => {
      setDecliningId(id);
      try {
         await declineAsk(id);
         toast.success(t('Request {name} declined').replace('{name}', identifier));
         await refresh();
      } catch (err) {
         toast.error(t('Failed to decline request'), {
            description: (err as Error).message,
         });
      } finally {
         setDecliningId(null);
      }
   };

   const teamOf = (key: string) => teams.find((team) => team.id === key);
   const reporterOf = (item: TriageItemDTO) =>
      item.reporterUserId ? members.find((member) => member.id === item.reporterUserId) : undefined;

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-5xl mx-auto px-6 py-10 pb-20">
            <h1 className="text-2xl font-medium">{t('Customer requests')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
               {t('Requests submitted by people in this workspace, waiting in team intake queues.')}
            </p>

            <div className="mt-6">
               {loadingError && <p className="text-sm text-destructive">{loadingError}</p>}
               {requests === null && !loadingError && (
                  <p className="text-sm text-muted-foreground">{t('Loading requests…')}</p>
               )}
               {requests !== null && (
                  <div className="rounded-lg border bg-container">
                     <div className="flex items-center px-4 py-2 text-xs text-muted-foreground border-b">
                        <span className="w-20 shrink-0">{t('Request')}</span>
                        <span className="flex-1 min-w-0">{t('Title')}</span>
                        <span className="hidden lg:block w-36 shrink-0">{t('Reporter')}</span>
                        <span className="hidden sm:block w-28 shrink-0">{t('Team')}</span>
                        <span className="hidden md:block w-28 shrink-0">{t('Received')}</span>
                        <span className="w-44 shrink-0 text-right">{t('Actions')}</span>
                     </div>
                     {requests.map((request) => {
                        const team = teamOf(request.teamId);
                        const reporter = reporterOf(request);
                        const preview = previewOf(request);
                        return (
                           <div
                              key={request.id}
                              className="flex items-center px-4 py-2.5 text-sm border-b border-border/40 last:border-b-0"
                           >
                              <span className="w-20 shrink-0 font-medium font-mono text-xs">
                                 {request.identifier}
                              </span>
                              <span className="flex-1 min-w-0 pr-4">
                                 <span className="block truncate" title={request.title}>
                                    {request.title}
                                 </span>
                                 {preview && (
                                    <span
                                       className="block truncate text-xs text-muted-foreground"
                                       title={preview}
                                    >
                                       {preview}
                                    </span>
                                 )}
                              </span>
                              <span className="hidden lg:flex w-36 shrink-0 items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                                 {reporter ? (
                                    <>
                                       <Avatar className="size-4">
                                          <AvatarImage
                                             src={reporter.avatarUrl}
                                             alt={reporter.name}
                                          />
                                          <AvatarFallback className="text-[8px]">
                                             {reporter.name[0]}
                                          </AvatarFallback>
                                       </Avatar>
                                       <span className="truncate">{reporter.name}</span>
                                    </>
                                 ) : (
                                    <>
                                       <UserRound className="size-3.5 shrink-0" />
                                       <span className="truncate">
                                          {request.reporterName ?? t('Unknown member')}
                                       </span>
                                    </>
                                 )}
                              </span>
                              <span className="hidden sm:block w-28 shrink-0 text-xs text-muted-foreground truncate">
                                 {team ? (
                                    <>
                                       <span className="text-sm leading-none">{team.icon}</span>{' '}
                                       {team.name}
                                    </>
                                 ) : (
                                    request.teamId
                                 )}
                              </span>
                              <span className="hidden md:block w-28 shrink-0 text-xs text-muted-foreground">
                                 {formatDate(request.receivedAt)}
                              </span>
                              <span className="w-44 shrink-0 flex items-center justify-end gap-1.5">
                                 <Button size="xxs" variant="ghost" asChild>
                                    <Link href={`/${orgId}/team/${request.teamId}/triage`}>
                                       <ExternalLink className="size-3.5" />
                                       {t('Open triage')}
                                    </Link>
                                 </Button>
                                 {canWrite && (
                                    <Button
                                       size="xxs"
                                       variant="ghost"
                                       className="text-destructive hover:text-destructive"
                                       disabled={decliningId === request.id}
                                       onClick={() => decline(request.id, request.identifier)}
                                    >
                                       {decliningId === request.id ? t('Declining…') : t('Decline')}
                                    </Button>
                                 )}
                              </span>
                           </div>
                        );
                     })}
                     {requests.length === 0 && (
                        <p className="text-sm text-muted-foreground px-4 py-6">
                           {t('No pending customer requests.')}
                        </p>
                     )}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}
