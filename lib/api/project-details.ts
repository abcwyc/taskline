import type { ContentBlock } from '@/mock-data/issue-details';
import type {
   ProjectDetail,
   ProjectUpdate,
   ProjectUpdateHealth,
} from '@/mock-data/project-details';
import type { User } from '@/mock-data/users';
import { useMembersStore } from '@/store/members-store';

import {
   PostProjectUpdateBody,
   ProjectDetailDTO,
   ProjectUpdateDTO,
   WorkspaceUpdateDTO,
} from './types';

/**
 * Client-side project-details API. DTO adapters rehydrate the User objects
 * expected by the existing components without substituting demo content.
 */

const BASE = '/api/projects';
const user = (id: string): User =>
   useMembersStore.getState().members.find((candidate) => candidate.id === id) ?? {
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

function dtoToUpdate(dto: ProjectUpdateDTO): ProjectUpdate {
   return {
      id: dto.id,
      author: user(dto.authorId),
      date: dto.date,
      health: dto.health as ProjectUpdateHealth,
      blocks: (dto.blocks as ContentBlock[]) ?? [],
   };
}

export function dtoToProjectDetail(dto: ProjectDetailDTO): ProjectDetail {
   return {
      projectId: dto.projectId,
      summary: dto.summary,
      description: dto.description as ContentBlock[],
      resources: dto.resources,
      milestones: dto.milestones.map((m) => ({
         id: m.id,
         name: m.name,
         completed: m.completed,
         ...(m.targetDate ? { targetDate: m.targetDate } : {}),
      })),
      updates: dto.updates.map(dtoToUpdate),
      activity: dto.activity.map((a) => ({
         id: a.id,
         user: user(a.userId),
         date: a.date,
         text: a.text,
      })),
   };
}

/* -------------------------------- calls --------------------------------- */

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetail> {
   const dto = await http<ProjectDetailDTO>(`${BASE}/${encodeURIComponent(projectId)}/detail`);
   return dtoToProjectDetail(dto);
}

export async function postProjectUpdate(
   projectId: string,
   health: ProjectUpdateHealth,
   text: string
): Promise<ProjectUpdate> {
   const body: PostProjectUpdateBody = { health, text };
   const dto = await http<ProjectUpdateDTO>(`${BASE}/${encodeURIComponent(projectId)}/updates`, {
      method: 'POST',
      body: JSON.stringify(body),
   });
   return dtoToUpdate(dto);
}

export async function setMilestoneCompleted(
   projectId: string,
   milestoneId: string,
   completed: boolean
): Promise<void> {
   await http<void>(
      `${BASE}/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}`,
      { method: 'PATCH', body: JSON.stringify({ completed }) }
   );
}

export async function createMilestone(
   projectId: string,
   name: string,
   targetDate?: string | null
): Promise<ProjectDetail['milestones'][number]> {
   return http<ProjectDetail['milestones'][number]>(
      `${BASE}/${encodeURIComponent(projectId)}/milestones`,
      { method: 'POST', body: JSON.stringify({ name, targetDate: targetDate ?? null }) }
   );
}

export async function updateMilestone(
   projectId: string,
   milestoneId: string,
   patch: { name?: string; targetDate?: string | null; completed?: boolean; order?: number }
): Promise<ProjectDetail['milestones'][number]> {
   return http<ProjectDetail['milestones'][number]>(
      `${BASE}/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
   );
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
   await http<void>(
      `${BASE}/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}`,
      { method: 'DELETE' }
   );
}

export async function deleteProjectUpdate(projectId: string, updateId: string): Promise<void> {
   await http<void>(
      `${BASE}/${encodeURIComponent(projectId)}/updates/${encodeURIComponent(updateId)}`,
      { method: 'DELETE' }
   );
}

/** Workspace-wide project-updates feed (newest first, up to 100). */
export async function fetchWorkspaceUpdates(): Promise<WorkspaceUpdateDTO[]> {
   return http<WorkspaceUpdateDTO[]>('/api/updates');
}
