import type { Project } from '@/mock-data/projects';
import type { Team } from '@/mock-data/teams';
import type { User } from '@/mock-data/users';
import { useProjectsStore } from '@/store/projects-store';
import { useMembersStore } from '@/store/members-store';

import { TeamCreateBody, TeamDTO, TeamUpdateBody } from './types';

/**
 * Client-side teams API. Related members/projects are resolved from the
 * persisted workspace caches, which hydrate before teams.
 */

const BASE = '/api/teams';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/* ----------------------------- DTO <-> domain ---------------------------- */

function resolveMembers(ids: string[]): User[] {
   const cache = useMembersStore.getState().members;
   return ids.map((id) => cache.find((u) => u.id === id)).filter((u): u is User => Boolean(u));
}

function resolveProjects(ids: string[]): Project[] {
   const cache = useProjectsStore.getState().projects;
   return ids.map((id) => cache.find((p) => p.id === id)).filter((p): p is Project => Boolean(p));
}

export function dtoToTeam(dto: TeamDTO): Team {
   return {
      id: dto.id,
      name: dto.name,
      icon: dto.icon,
      color: dto.color,
      joined: dto.joined,
      members: resolveMembers(dto.memberIds),
      projects: resolveProjects(dto.projectIds),
   };
}

export function teamPatchToBody(patch: Partial<Team>): TeamUpdateBody {
   const body: TeamUpdateBody = {};
   if ('name' in patch) body.name = patch.name;
   if ('icon' in patch) body.icon = patch.icon;
   if ('color' in patch) body.color = patch.color;
   if ('joined' in patch) body.joined = patch.joined;
   return body;
}

/* -------------------------------- calls --------------------------------- */

export async function fetchTeams(): Promise<Team[]> {
   return (await http<TeamDTO[]>(BASE)).map(dtoToTeam);
}

export async function fetchTeam(id: string): Promise<Team> {
   return dtoToTeam(await http<TeamDTO>(`${BASE}/${encodeURIComponent(id)}`));
}

export async function createTeam(input: TeamCreateBody): Promise<Team> {
   return dtoToTeam(await http<TeamDTO>(BASE, { method: 'POST', body: JSON.stringify(input) }));
}

export async function updateTeam(id: string, patch: TeamUpdateBody): Promise<Team> {
   return dtoToTeam(
      await http<TeamDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}

export async function deleteTeam(id: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
