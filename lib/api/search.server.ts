import 'server-only';

import { db } from '@/lib/db';
import type { SearchResults } from './types';

/**
 * Workspace-wide quick search for the command palette.
 *
 * Plain `ILIKE '%q%'` — fine for a single-team workspace (tens of thousands of
 * rows scan in well under a frame). If an instance ever outgrows that, add a
 * `pg_trgm` GIN index on the searched columns; the queries here don't change.
 */

const EMPTY: SearchResults = { issues: [], projects: [], initiatives: [], documents: [] };

export async function search(orgId: string, raw: string): Promise<SearchResults> {
   const q = raw.trim();
   if (q.length < 2) return EMPTY;
   const like = { contains: q, mode: 'insensitive' as const };

   const [issues, projects, initiatives, documents] = await Promise.all([
      db.issue.findMany({
         where: { orgId, OR: [{ title: like }, { identifier: like }] },
         select: { identifier: true, title: true, stateId: true },
         orderBy: { updatedAt: 'desc' },
         take: 8,
      }),
      db.project.findMany({
         where: { orgId, name: like },
         select: { id: true, name: true, icon: true },
         orderBy: { updatedAt: 'desc' },
         take: 5,
      }),
      db.initiative.findMany({
         where: { orgId, name: like },
         select: { id: true, name: true },
         orderBy: { updatedAt: 'desc' },
         take: 5,
      }),
      db.document.findMany({
         where: { folder: { orgId }, name: like },
         select: { id: true, name: true },
         orderBy: { updatedAt: 'desc' },
         take: 5,
      }),
   ]);

   return {
      issues: issues.map((i) => ({
         identifier: i.identifier,
         title: i.title,
         statusId: i.stateId,
      })),
      projects: projects.map((p) => ({ id: p.id, name: p.name, iconKey: p.icon })),
      initiatives,
      documents: documents.map((d) => ({ id: d.id, title: d.name })),
   };
}
