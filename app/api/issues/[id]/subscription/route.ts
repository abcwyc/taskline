import { NextResponse } from 'next/server';

import { isContext, requireContext } from '@/lib/api/context';
import {
   isSubscribed,
   subscribeToIssue,
   unsubscribeFromIssue,
} from '@/lib/api/issue-events.server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function resolve(orgId: string, idOrIdentifier: string) {
   return db.issue.findFirst({
      where: { orgId, OR: [{ id: idOrIdentifier }, { identifier: idOrIdentifier }] },
      select: { id: true },
   });
}

// GET → { subscribed }
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const issue = await resolve(ctx.orgId, (await params).id);
   if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 });
   return NextResponse.json({ subscribed: await isSubscribed(issue.id, ctx.userId) });
}

// PUT → subscribe
export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const issue = await resolve(ctx.orgId, (await params).id);
   if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 });
   await subscribeToIssue(db, issue.id, ctx.userId);
   return NextResponse.json({ subscribed: true });
}

// DELETE → unsubscribe
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const issue = await resolve(ctx.orgId, (await params).id);
   if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 });
   await unsubscribeFromIssue(db, issue.id, ctx.userId);
   return NextResponse.json({ subscribed: false });
}
