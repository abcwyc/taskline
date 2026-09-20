import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { realtimeBus } from '@/lib/realtime.server';
import { extractIssueIdentifiers, verifyGithubSignature } from '@/lib/api/github-webhook.server';
import { getSetting } from '@/lib/api/workspace-settings.server';

export const dynamic = 'force-dynamic';

interface PullRequestPayload {
   action?: string;
   pull_request?: {
      title?: string;
      body?: string | null;
      draft?: boolean;
      merged?: boolean;
      html_url?: string;
      head?: { ref?: string };
   };
}

/**
 * POST /api/integrations/github/webhook — GitHub → Circle, inbound only.
 *
 * Configure in GitHub: Settings → Webhooks → payload URL
 * `https://<host>/api/integrations/github/webhook`, content type
 * `application/json`, secret = the value of `GITHUB_WEBHOOK_SECRET`.
 *
 * On PR events it (a) links the PR to every issue whose identifier appears in
 * the title, body or branch name and (b) — when the workspace `github.autoDone`
 * setting is on — moves merged issues to the first COMPLETED workflow state.
 *
 * Like the rest of Circle, this assumes the single-workspace deployment shape:
 * the target workspace is the first org.
 */
export async function POST(req: NextRequest) {
   const secret = process.env.GITHUB_WEBHOOK_SECRET;
   if (!secret) {
      return NextResponse.json({ error: 'github webhook not configured' }, { status: 503 });
   }

   const raw = await req.text();
   if (!verifyGithubSignature(secret, raw, req.headers.get('x-hub-signature-256'))) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
   }
   if (req.headers.get('x-github-event') === 'ping') {
      return NextResponse.json({ ok: true, pong: true });
   }

   let payload: PullRequestPayload;
   try {
      payload = JSON.parse(raw) as PullRequestPayload;
   } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
   }
   const pr = payload.pull_request;
   if (req.headers.get('x-github-event') !== 'pull_request' || !pr?.html_url) {
      return NextResponse.json({ ok: true, ignored: true });
   }

   const org = await db.organization.findFirst({ orderBy: { createdAt: 'asc' } });
   if (!org) return NextResponse.json({ ok: true, matched: 0 });

   const identifiers = extractIssueIdentifiers(pr.title, pr.body, pr.head?.ref);
   if (identifiers.length === 0) return NextResponse.json({ ok: true, matched: 0 });

   const issues = await db.issue.findMany({
      where: { orgId: org.id, identifier: { in: identifiers } },
      select: { id: true },
   });
   if (issues.length === 0) return NextResponse.json({ ok: true, matched: 0 });

   // MERGED when closed-and-merged; a plain close (not merged) has no matching
   // PrStatus, so the link keeps its previous state.
   const nextStatus =
      payload.action === 'closed' ? (pr.merged ? 'MERGED' : null) : pr.draft ? 'DRAFT' : 'OPEN';
   const autoDone =
      ((await getSetting(org.id, 'github')) as { autoDone?: boolean }).autoDone ?? true;

   let doneStateId: string | null = null;
   if (payload.action === 'closed' && pr.merged && autoDone) {
      const doneState = await db.workflowState.findFirst({
         where: { orgId: org.id, category: 'COMPLETED' },
         orderBy: { workflowOrder: 'asc' },
      });
      doneStateId = doneState?.id ?? null;
   }

   for (const issue of issues) {
      await db.$transaction(async (tx) => {
         const existing = await tx.prLink.findFirst({
            where: { issueId: issue.id, url: pr.html_url as string },
            select: { id: true },
         });
         if (existing) {
            if (nextStatus) {
               await tx.prLink.update({
                  where: { id: existing.id },
                  data: { status: nextStatus },
               });
            }
         } else {
            await tx.prLink.create({
               data: {
                  issueId: issue.id,
                  title: pr.title?.slice(0, 200) || 'Pull request',
                  url: pr.html_url as string,
                  status: nextStatus ?? 'OPEN',
               },
            });
         }
         if (doneStateId) {
            await tx.issue.update({
               where: { id: issue.id },
               data: { stateId: doneStateId, completedAt: new Date() },
            });
         }
      });
      realtimeBus.publish(org.id, {
         resource: 'issue',
         action: 'updated',
         id: issue.id,
      });
   }

   return NextResponse.json({ ok: true, matched: issues.length });
}
