import { Issue } from '@/mock-data/issues';
import { LabelInterface, labels as labelRegistry } from '@/mock-data/labels';
import { priorities } from '@/mock-data/priorities';
import { projects as projectFallback } from '@/mock-data/projects';
import { status as statusRegistry } from '@/mock-data/status';
import { users as userRegistry } from '@/mock-data/users';
import { useProjectsStore } from '@/store/projects-store';

import { IssueCreateBody, IssueDTO, IssueUpdateBody, ListIssuesQuery } from './types';

/**
 * Client-side issues API.
 *
 *  - `fetch*` hit the route handlers under `/api/issues`.
 *  - `dtoToIssue` re-hydrates the rich `Issue` the components expect by looking
 *    up ids in the mock-data registries. Those registries are now just static
 *    lookup tables (statuses, priorities + their icons). When the projects /
 *    members / labels slices land, swap the corresponding registry for that
 *    slice's fetched cache — the mapper shape does not change.
 *
 * This module is the template every other entity's `lib/api/<entity>.ts` copies.
 */

const BASE = '/api/issues';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, {
      headers: { 'content-type': 'application/json' },
      ...init,
   });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/* ----------------------------- DTO <-> domain ---------------------------- */

const fallbackStatus = statusRegistry.find((s) => s.id === 'to-do') ?? statusRegistry[0];
const fallbackPriority = priorities.find((p) => p.id === 'no-priority') ?? priorities[0];

/** Prefer the live projects cache; fall back to the static mock list before hydrate. */
function resolveProject(projectId: string | null) {
   if (!projectId) return undefined;
   return (
      useProjectsStore.getState().projects.find((p) => p.id === projectId) ??
      projectFallback.find((p) => p.id === projectId)
   );
}

export function dtoToIssue(dto: IssueDTO): Issue {
   return {
      id: dto.id,
      identifier: dto.identifier,
      title: dto.title,
      description: dto.description,
      status: statusRegistry.find((s) => s.id === dto.statusId) ?? fallbackStatus,
      priority: priorities.find((p) => p.id === dto.priorityId) ?? fallbackPriority,
      assignee: dto.assigneeId ? (userRegistry.find((u) => u.id === dto.assigneeId) ?? null) : null,
      creatorId: dto.createdById ?? undefined,
      labels: dto.labelIds
         .map((id) => labelRegistry.find((l) => l.id === id))
         .filter((l): l is LabelInterface => Boolean(l)),
      project: resolveProject(dto.projectId),
      cycleId: dto.cycleId,
      subissues: [],
      rank: dto.rank,
      createdAt: dto.createdAt,
      ...(dto.dueDate ? { dueDate: dto.dueDate } : {}),
   };
}

/** Full `Issue` (from the create modal) → the body the POST route accepts. */
export function issueToCreateBody(issue: Issue, parentId?: string): IssueCreateBody {
   return {
      title: issue.title,
      description: issue.description,
      statusId: issue.status.id,
      priorityId: issue.priority.id,
      assigneeId: issue.assignee?.id ?? null,
      labelIds: issue.labels.map((l) => l.id),
      projectId: issue.project?.id ?? null,
      cycleId: issue.cycleId || undefined,
      dueDate: issue.dueDate ?? undefined,
      ...(parentId ? { parentId } : {}),
   };
}

/** `Partial<Issue>` (from a store action) → the PATCH body. */
export function issuePatchToBody(patch: Partial<Issue>): IssueUpdateBody {
   const body: IssueUpdateBody = {};
   if ('title' in patch) body.title = patch.title;
   if ('description' in patch) body.description = patch.description;
   if ('status' in patch && patch.status) body.statusId = patch.status.id;
   if ('priority' in patch && patch.priority) body.priorityId = patch.priority.id;
   if ('assignee' in patch) body.assigneeId = patch.assignee ? patch.assignee.id : null;
   if ('labels' in patch) body.labelIds = (patch.labels ?? []).map((l) => l.id);
   if ('project' in patch) body.projectId = patch.project ? patch.project.id : null;
   if ('cycleId' in patch) body.cycleId = patch.cycleId ?? '';
   if ('dueDate' in patch) body.dueDate = patch.dueDate ?? null;
   if ('rank' in patch) body.rank = patch.rank;
   return body;
}

/* -------------------------------- calls --------------------------------- */

export async function fetchIssues(query: ListIssuesQuery = {}): Promise<Issue[]> {
   const params = new URLSearchParams();
   Object.entries(query).forEach(([k, v]) => v !== undefined && params.set(k, String(v)));
   const qs = params.toString();
   const dtos = await http<IssueDTO[]>(`${BASE}${qs ? `?${qs}` : ''}`);
   return dtos.map(dtoToIssue);
}

export async function fetchIssue(id: string): Promise<Issue> {
   return dtoToIssue(await http<IssueDTO>(`${BASE}/${encodeURIComponent(id)}`));
}

export async function createIssue(input: IssueCreateBody): Promise<Issue> {
   return dtoToIssue(await http<IssueDTO>(BASE, { method: 'POST', body: JSON.stringify(input) }));
}

export async function updateIssue(id: string, patch: IssueUpdateBody): Promise<Issue> {
   return dtoToIssue(
      await http<IssueDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}

export async function deleteIssue(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
