import { formatDistanceToNowStrict } from 'date-fns';

import { Issue } from '@/mock-data/issues';
import {
   ActivityItem,
   ContentBlock,
   getIssueDetail as mockGetIssueDetail,
   IssueDetail,
} from '@/mock-data/issue-details';
import { users as mockUsers } from '@/mock-data/users';
import { useMembersStore } from '@/store/members-store';

import { IssueDetailDTO, IssueCommentDTO, PostCommentBody } from './types';

const BASE = '/api/issues';
const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: false });
const user = (id: string) =>
   useMembersStore.getState().members.find((u) => u.id === id) ??
   mockUsers.find((u) => u.id === id) ??
   mockUsers[0];

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

export function dtoToIssueDetail(dto: IssueDetailDTO, fallbackIssue?: Issue): IssueDetail {
   const mock = fallbackIssue ? mockGetIssueDetail(fallbackIssue) : null;
   const hasDescription = dto.description.length > 0;

   const events: ActivityItem[] = dto.activity.map((a) => ({
      kind: 'event',
      id: a.id,
      actor: user(a.actorId),
      event: a.field ?? a.verb,
      text: a.text,
      timeAgo: ago(a.createdAt),
   }));
   const comments = dto.comments.map(commentToItem);
   const activity = [...events, ...comments];

   return {
      identifier: dto.identifier,
      description: hasDescription ? (dto.description as ContentBlock[]) : (mock?.description ?? []),
      activity: activity.length ? activity : (mock?.activity ?? []),
      subIssueIds: dto.subIssueIds,
      relatedIds: dto.relatedIds,
      blockedByIds: dto.blockedByIds,
      prLinks: dto.prLinks.map((p) => ({
         id: p.id,
         title: p.title,
         status: p.status as 'open' | 'merged' | 'draft',
      })),
      ...(dto.milestone ? { milestone: dto.milestone } : {}),
   };
}

/* -------------------------------- calls --------------------------------- */

export async function fetchIssueDetail(
   idOrIdentifier: string,
   fallbackIssue?: Issue
): Promise<IssueDetail> {
   try {
      const dto = await http<IssueDetailDTO>(
         `${BASE}/${encodeURIComponent(idOrIdentifier)}/detail`
      );
      return dtoToIssueDetail(dto, fallbackIssue);
   } catch {
      return fallbackIssue
         ? mockGetIssueDetail(fallbackIssue)
         : ({ identifier: idOrIdentifier, description: [], activity: [] } as IssueDetail);
   }
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
