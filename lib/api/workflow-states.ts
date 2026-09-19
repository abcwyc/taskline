'use client';

import {
   status as statusRegistry,
   StatusCheckIcon,
   StatusDuplicateIcon,
   StatusGearIcon,
   StatusPieIcon,
   StatusTriageIcon,
   StatusXIcon,
} from '@/mock-data/status';
import type { Status, StatusCategory } from '@/mock-data/status';

import { WorkflowStateCreateBody, WorkflowStateDTO, WorkflowStateUpdateBody } from './types';

/**
 * Client-side workflow-states API. `syncStatusRegistry` folds the org's live
 * statuses (including admin-created ones) into the runtime registry every
 * component reads (`status` in mock-data/status), so custom statuses appear in
 * menus, filters and selectors without touching each component.
 */

const BASE = '/api/workflow-states';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/* --------------------------- icon resolution ------------------------------ */

/** iconKey is either a preset status key ("in-progress") or a generic builder name. */
function iconFor(iconKey: string, color: string): Status['icon'] {
   const preset = statusRegistry.find((s) => s.id === iconKey);
   if (preset) return preset.icon;
   switch (iconKey) {
      case 'check':
         return () => StatusCheckIcon({ color });
      case 'gear':
         return () => StatusGearIcon({ color });
      case 'triage':
         return () => StatusTriageIcon({ color });
      case 'x':
         return () => StatusXIcon({ color });
      case 'duplicate':
         return () => StatusDuplicateIcon({ color });
      case 'pie':
      default:
         return () => StatusPieIcon({ color, fraction: 0.4 });
   }
}

function dtoToStatus(dto: WorkflowStateDTO): Status {
   return {
      id: dto.id,
      name: dto.name,
      color: dto.color,
      category: dto.category as StatusCategory,
      icon: iconFor(dto.iconKey, dto.color),
   };
}

/* --------------------------- registry syncing ----------------------------- */

/**
 * Mutate the runtime registry in place: update known keys, append new ones,
 * drop deleted ones. The first six preset entries are never removed (mock
 * fixtures index into them); admin deletion of in-use statuses is blocked
 * server-side anyway.
 */
export function syncStatusRegistry(states: WorkflowStateDTO[]): void {
   const protectedIds = new Set([
      'in-progress',
      'technical-review',
      'done',
      'paused',
      'to-do',
      'backlog',
   ]);
   const liveKeys = new Set(states.map((s) => s.id));

   // update or append
   for (const state of states) {
      const existing = statusRegistry.find((s) => s.id === state.id);
      if (existing) {
         existing.name = state.name;
         existing.color = state.color;
         existing.category = state.category as StatusCategory;
      } else {
         statusRegistry.push(dtoToStatus(state));
      }
   }
   // drop deleted custom statuses (keep protected presets + any still referenced)
   for (let i = statusRegistry.length - 1; i >= 0; i--) {
      const id = statusRegistry[i]!.id;
      if (!liveKeys.has(id) && !protectedIds.has(id)) statusRegistry.splice(i, 1);
   }
}

/* -------------------------------- calls ---------------------------------- */

export async function fetchWorkflowStates(): Promise<WorkflowStateDTO[]> {
   return http<WorkflowStateDTO[]>(BASE);
}

export async function createWorkflowState(
   body: WorkflowStateCreateBody
): Promise<WorkflowStateDTO> {
   return http<WorkflowStateDTO>(BASE, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateWorkflowState(
   key: string,
   body: WorkflowStateUpdateBody
): Promise<WorkflowStateDTO> {
   return http<WorkflowStateDTO>(`${BASE}/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
   });
}

export async function deleteWorkflowState(key: string): Promise<void> {
   await http<void>(`${BASE}/${encodeURIComponent(key)}`, { method: 'DELETE' });
}

/** Hydrate the registry from the server; safe to call repeatedly. */
export async function hydrateWorkflowStates(): Promise<void> {
   syncStatusRegistry(await fetchWorkflowStates());
}
