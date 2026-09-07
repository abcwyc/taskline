import { formatDistanceToNowStrict } from 'date-fns';

import type { ActivityItem, ContentBlock, IssueDetail } from '@/mock-data/issue-details';
import type { User } from '@/mock-data/users';
import { useMembersStore } from '@/store/members-store';

import { IssueDetailDTO, IssueCommentDTO, PostCommentBody } from './types';

const BASE = '/api/issues';
const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: false });
const user = (id: string): User =>
   useMembersStore.getState().members.find((u) => u.id === id) ?? {
      id,
      name: 'Unknown member',
      avatarUrl: '',
      email: '',
      status: 'offline',
      role: 'Member',
      joinedDate: '',
      teamIds: [],
      timezone: 'UTC',
   };

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/* ----------------------------- DTO <-> domain ---------------------------- */

function commentToItem(c: IssueCommentDTO): Extract<ActivityItem, { kind: 'comment' }> {
   return {
      kind: 'comment',
      id: c.id,
      actor: user(c.authorId),
      timeAgo: ago(c.createdAt),
      body: (c.body as ContentBlock[]) ?? [],
      ...(c.reactions.length ? { reactions: c.reactions } : {}),
   };
}

export function dtoToIssueDetail(dto: IssueDetailDTO): IssueDetail {
   // interleave events + comments in chronological order
   const dated: { at: number; item: ActivityItem }[] = [
      ...dto.activity.map((a) => ({
         at: new Date(a.createdAt).getTime(),
         item: {
            kind: 'event' as const,
            id: a.id,
            actor: user(a.actorId),
            event: a.field ?? a.verb,
            text: a.text,
            timeAgo: ago(a.createdAt),
         },
      })),
      ...dto.comments.map((c) => ({
         at: new Date(c.createdAt).getTime(),
         item: commentToItem(c),
      })),
   ];
   dated.sort((x, y) => x.at - y.at);
   const activity = dated.map((d) => d.item);

   return {
      identifier: dto.identifier,
      description: dto.description as ContentBlock[],
      activity,
      relatedIds: dto.relatedIds,
      blockedByIds: dto.blockedByIds,
      prLinks: dto.prLinks.map((p) => ({
         id: p.id,
         title: p.title,
         status: p.status as 'open' | 'merged' | 'draft',
      })),
      ...(dto.milestone ? { milestone: dto.milestone } : {}),
      subscribed: dto.subscribed,
   };
}

export async function setIssueSubscription(
   idOrIdentifier: string,
   subscribed: boolean
): Promise<boolean> {
   const res = await http<{ subscribed: boolean }>(
      `${BASE}/${encodeURIComponent(idOrIdentifier)}/subscription`,
      { method: subscribed ? 'PUT' : 'DELETE' }
   );
   return res.subscribed;
}

/* -------------------------------- calls --------------------------------- */

export async function fetchIssueDetail(idOrIdentifier: string): Promise<IssueDetail> {
   const dto = await http<IssueDetailDTO>(`${BASE}/${encodeURIComponent(idOrIdentifier)}/detail`);
   return dtoToIssueDetail(dto);
}

export async function postIssueComment(
   idOrIdentifier: string,
   text: string
): Promise<Extract<ActivityItem, { kind: 'comment' }>> {
   const body: PostCommentBody = { text };
   const dto = await http<IssueCommentDTO>(
      `${BASE}/${encodeURIComponent(idOrIdentifier)}/comments`,
      { method: 'POST', body: JSON.stringify(body) }
   );
   return commentToItem(dto);
}
