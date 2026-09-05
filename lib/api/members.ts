import { User, users as userFallback } from '@/mock-data/users';

import { MemberDTO, MemberUpdateBody } from './types';

/**
 * Client-side members API — mirrors lib/api/projects.ts. `dtoToMember` maps the
 * wire DTO onto the `User` shape the components already use.
 */

const BASE = '/api/members';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export function dtoToMember(dto: MemberDTO): User {
   return {
      id: dto.id,
      name: dto.name,
      email: dto.email,
      avatarUrl: dto.avatarUrl ?? '',
      status: (dto.status as User['status']) ?? 'offline',
      role: (dto.role as User['role']) ?? 'Member',
      joinedDate: dto.joinedDate,
      timezone: dto.timezone,
      teamIds: dto.teamIds,
   };
}

export function memberPatchToBody(patch: Partial<User>): MemberUpdateBody {
   const body: MemberUpdateBody = {};
   if ('name' in patch) body.name = patch.name;
   if ('role' in patch) body.role = patch.role;
   if ('timezone' in patch) body.timezone = patch.timezone;
   return body;
}

export async function fetchMembers(): Promise<User[]> {
   const dtos = await http<MemberDTO[]>(BASE).catch(() => null);
   return dtos ? dtos.map(dtoToMember) : userFallback;
}

export async function fetchMember(id: string): Promise<User> {
   return dtoToMember(await http<MemberDTO>(`${BASE}/${encodeURIComponent(id)}`));
}

export async function updateMember(id: string, patch: MemberUpdateBody): Promise<User> {
   return dtoToMember(
      await http<MemberDTO>(`${BASE}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify(patch),
      })
   );
}
