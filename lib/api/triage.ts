import { Issue } from '@/mock-data/issues';
import { LabelInterface, labels as mockLabels } from '@/mock-data/labels';
import { projects as mockProjects } from '@/mock-data/projects';
import { status as mockStatus } from '@/mock-data/status';
import { TriageIntelligence, TriageItem, triageItems as mockTriage } from '@/mock-data/triage';
import { users as mockUsers } from '@/mock-data/users';
import { dtoToIssue } from '@/lib/api/issues';
import { useLabelsStore } from '@/store/labels-store';
import { useMembersStore } from '@/store/members-store';
import { useProjectsStore } from '@/store/projects-store';

import { IssueDTO, TriageItemDTO } from './types';

const BASE = '/api/triage';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const findUser = (id?: string | null) =>
   (id && useMembersStore.getState().members.find((u) => u.id === id)) ||
   (id && mockUsers.find((u) => u.id === id)) ||
   undefined;
const findProject = (id?: string | null) =>
   (id && useProjectsStore.getState().projects.find((p) => p.id === id)) ||
   (id && mockProjects.find((p) => p.id === id)) ||
   undefined;
const findLabel = (key: string): LabelInterface | undefined =>
   useLabelsStore.getState().labels.find((l) => l.id === key) ??
   mockLabels.find((l) => l.id === key);

export function dtoToTriageItem(dto: TriageItemDTO): TriageItem {
   const intelRaw = dto.intelligence as {
      suggestedAssigneeId?: string | null;
      suggestedProjectId?: string | null;
      suggestedLabelKeys?: string[];
      related?: { identifier: string; title: string; statusKey: string }[];
   };
   const intelligence: TriageIntelligence = {
      suggestedAssignee: findUser(intelRaw.suggestedAssigneeId),
      suggestedProject: findProject(intelRaw.suggestedProjectId),
      suggestedLabels: (intelRaw.suggestedLabelKeys ?? [])
         .map(findLabel)
         .filter((l): l is LabelInterface => Boolean(l)),
      related: (intelRaw.related ?? []).map((r) => ({
         identifier: r.identifier,
         title: r.title,
         status: mockStatus.find((s) => s.id === r.statusKey) ?? mockStatus[0],
      })),
   };

   return {
      id: dto.id,
      identifier: dto.identifier,
      title: dto.title,
      teamId: dto.teamId,
      reporter:
         dto.reporterKind === 'integration'
            ? { kind: 'integration', name: dto.reporterName ?? 'Integration' }
            : { kind: 'user', user: findUser(dto.reporterUserId) ?? mockUsers[0] },
      receivedAgo: relativeAgo(dto.receivedAt),
      intelligence,
      sections: (dto.sections as { heading: string; body: string }[]) ?? [],
      ...(dto.preview ? { preview: dto.preview as unknown as TriageItem['preview'] } : {}),
   };
}

function relativeAgo(iso: string): string {
   const diff = Date.now() - new Date(iso).getTime();
   const h = Math.round(diff / 3_600_000);
   if (h < 24) return `${Math.max(1, h)}h ago`;
   return `${Math.round(h / 24)}d ago`;
}

export async function fetchTriageItems(): Promise<TriageItem[]> {
   const dtos = await http<TriageItemDTO[]>(BASE).catch(() => null);
   return dtos ? dtos.map(dtoToTriageItem) : mockTriage;
}

export async function acceptTriageItem(id: string): Promise<Issue> {
   const dto = await http<IssueDTO>(`${BASE}/${encodeURIComponent(id)}/accept`, { method: 'POST' });
   return dtoToIssue(dto);
}

export async function setTriageItemStatus(
   id: string,
   status: 'declined' | 'snoozed'
): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
   });
}
