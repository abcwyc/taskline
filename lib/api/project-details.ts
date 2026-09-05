import type { ContentBlock } from '@/mock-data/issue-details';
import {
   getProjectDetail as mockGetProjectDetail,
   ProjectDetail,
   ProjectUpdate,
   ProjectUpdateHealth,
} from '@/mock-data/project-details';
import { users as userRegistry } from '@/mock-data/users';

import { PostProjectUpdateBody, ProjectDetailDTO, ProjectUpdateDTO } from './types';

/**
 * Client-side project-details API. `dtoToProjectDetail` re-hydrates the rich
 * `ProjectDetail` the components expect (User objects on updates/activity).
 * Falls back to the deterministic mock detail until the real fetch resolves or
 * when the project has no detail row yet.
 */

const BASE = '/api/projects';
const user = (id: string) => userRegistry.find((u) => u.id === id) ?? userRegistry[0];

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
   const mock = mockGetProjectDetail(dto.projectId);
   const hasContent = dto.summary !== '' || dto.description.length > 0;

   return {
      projectId: dto.projectId,
      summary: hasContent ? dto.summary : mock.summary,
      description: hasContent ? (dto.description as ContentBlock[]) : mock.description,
      resources: dto.resources.length > 0 ? dto.resources : mock.resources,
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
   try {
      const dto = await http<ProjectDetailDTO>(`${BASE}/${encodeURIComponent(projectId)}/detail`);
      return dtoToProjectDetail(dto);
   } catch {
      return mockGetProjectDetail(projectId);
   }
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
