import type { Issue } from '@/mock-data/issues';
import type { LabelInterface } from '@/mock-data/labels';
import { priorities } from '@/mock-data/priorities';
import { status as statusRegistry } from '@/mock-data/status';
import { useLabelsStore } from '@/store/labels-store';
import { useMembersStore } from '@/store/members-store';
import { useProjectsStore } from '@/store/projects-store';

import { IssueCreateBody, IssueDTO, IssueUpdateBody, ListIssuesQuery } from './types';

/**
 * Client-side issues API. Status and priority registries supply icon metadata;
 * workspace-owned projects, members and labels come only from hydrated stores.
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

export function dtoToIssue(dto: IssueDTO): Issue {
   const members = useMembersStore.getState().members;
   const labels = useLabelsStore.getState().labels;
   const projects = useProjectsStore.getState().projects;
   return {
      id: dto.id,
      identifier: dto.identifier,
      title: dto.title,
      description: dto.description,
      status: statusRegistry.find((s) => s.id === dto.statusId) ?? fallbackStatus,
      priority: priorities.find((p) => p.id === dto.priorityId) ?? fallbackPriority,
      assignee: dto.assigneeId
         ? (members.find((member) => member.id === dto.assigneeId) ?? null)
         : null,
      creatorId: dto.createdById ?? undefined,
      labels: dto.labelIds
         .map((id) => labels.find((label) => label.id === id))
         .filter((label): label is LabelInterface => Boolean(label)),
      project: dto.projectId ? projects.find((project) => project.id === dto.projectId) : undefined,
      cycleId: dto.cycleId,
      subissues: [],
      rank: dto.rank,
      createdAt: dto.createdAt,
      estimate: dto.estimate ?? undefined,
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
      estimate: issue.estimate ?? null,
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
   if ('estimate' in patch) body.estimate = patch.estimate ?? null;
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
