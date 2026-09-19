import { NextRequest, NextResponse } from 'next/server';

import { isContext, requireContext, requireWrite } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import { issueTemplateCreate } from '@/lib/api/schemas';
import { createIssueTemplate, listIssueTemplates } from '@/lib/api/issue-templates.server';

export const dynamic = 'force-dynamic';

export async function GET() {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   return NextResponse.json(await listIssueTemplates(ctx.orgId));
}

// POST /api/issue-templates   { name, description?, title?, body?, icon?, teamId? }
export async function POST(req: NextRequest) {
   const ctx = await requireWrite();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(req, issueTemplateCreate);
      const created = await createIssueTemplate(ctx.orgId, body);
      return NextResponse.json(created, { status: 201 });
   } catch (err) {
      return errorResponse(err);
   }
}
