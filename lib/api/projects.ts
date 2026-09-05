import { LabelInterface, labels as labelRegistry } from '@/mock-data/labels';
import { priorities } from '@/mock-data/priorities';
import { health as healthRegistry, Project } from '@/mock-data/projects';
import { status as statusRegistry } from '@/mock-data/status';
import { users as userRegistry } from '@/mock-data/users';

import { resolveProjectIcon } from './project-icons';
import { ListProjectsQuery, ProjectCreateBody, ProjectDTO, ProjectUpdateBody } from './types';

/**
 * Client-side projects API — mirrors `lib/api/issues.ts`.
 *
 * `dtoToProject` re-hydrates the rich `Project` (icon component, nested status /
 * lead / priority / health / labels objects) from the mock-data registries.
 */

const BASE = '/api/projects';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/* ----------------------------- DTO <-> domain ---------------------------- */

const fallbackStatus = statusRegistry.find((s) => s.id === 'to-do') ?? statusRegistry[0];
const fallbackPriority = priorities.find((p) => p.id === 'no-priority') ?? priorities[0];
const fallbackHealth = healthRegistry.find((h) => h.id === 'no-update') ?? healthRegistry[0];
const fallbackLead = userRegistry[0];

export function dtoToProject(dto: ProjectDTO): Project {
   return {
      id: dto.id,
      name: dto.name,
      status: statusRegistry.find((s) => s.id === dto.statusId) ?? fallbackStatus,
      icon: resolveProjectIcon(dto.iconKey),
      percentComplete: dto.percentComplete,
      startDate: dto.startDate,
      lead: (dto.leadId && userRegistry.find((u) => u.id === dto.leadId)) || fallbackLead,
      priority: priorities.find((p) => p.id === dto.priorityId) ?? fallbackPriority,
      health: healthRegistry.find((h) => h.id === dto.healthId) ?? fallbackHealth,
      teamId: dto.teamId,
      labels: dto.labelIds
         .map((id) => labelRegistry.find((l) => l.id === id))
         .filter((l): l is LabelInterface => Boolean(l)),
      ...(dto.targetDate ? { targetDate: dto.targetDate } : {}),
      ...(dto.initiativeId ? { initiative: dto.initiativeId } : {}),
      ...(dto.healthUpdatedAgoDays != null
         ? { healthUpdatedAgoDays: dto.healthUpdatedAgoDays }
         : {}),
   };
}

export function projectToCreateBody(project: Project): ProjectCreateBody {
   return {
      name: project.name,
      iconKey: (project.icon as { displayName?: string })?.displayName ?? 'Box',
      statusId: project.status.id,
      priorityId: project.priority.id,
      healthId: project.health.id,
      leadId: project.lead?.id ?? null,
      initiativeId: project.initiative ?? null,
      teamId: project.teamId,
      labelIds: project.labels.map((l) => l.id),
      startDate: project.startDate || undefined,
      targetDate: project.targetDate ?? undefined,
   };
}

export function projectPatchToBody(patch: Partial<Project>): ProjectUpdateBody {
   const body: ProjectUpdateBody = {};
   if ('name' in patch) body.name = patch.name;
   if ('icon' in patch && patch.icon) {
      body.iconKey = (patch.icon as { displayName?: string }).displayName ?? 'Box';
   }
   if ('status' in patch && patch.status) body.statusId = patch.status.id;
   if ('priority' in patch && patch.priority) body.priorityId = patch.priority.id;
   if ('health' in patch && patch.health) body.healthId = patch.health.id;
   if ('lead' in patch) body.leadId = patch.lead ? patch.lead.id : null;
   if ('initiative' in patch) body.initiativeId = patch.initiative ?? null;
   if ('teamId' in patch) body.teamId = patch.teamId;
   if ('labels' in patch) body.labelIds = (patch.labels ?? []).map((l) => l.id);
   if ('startDate' in patch) body.startDate = patch.startDate || undefined;
   if ('targetDate' in patch) body.targetDate = patch.targetDate ?? null;
   return body;
}

/* -------------------------------- calls --------------------------------- */

export async function fetchProjects(query: ListProjectsQuery = {}): Promise<Project[]> {
   const params = new URLSearchParams();
   Object.entries(query).forEach(([k, v]) => v !== undefined && params.set(k, String(v)));
   const qs = params.toString();
   const dtos = await http<ProjectDTO[]>(`${BASE}${qs ? `?${qs}` : ''}`);
   return dtos.map(dtoToProject);
}

export async function fetchProject(id: string): Promise<Project> {
   return dtoToProject(await http<ProjectDTO>(`${BASE}/${encodeURIComponent(id)}`));
}

export async function createProject(input: ProjectCreateBody): Promise<Project> {
   return dtoToProject(
      await http<ProjectDTO>(BASE, { method: 'POST', body: JSON.stringify(input) })
   );
}

export async function updateProject(id: string, patch: ProjectUpdateBody): Promise<Project> {
   return dtoToProject(
      await http<ProjectDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}

export async function deleteProject(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
