import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isContext, requireAdmin, requireContext } from '@/lib/api/context';
import { errorResponse, parseBody } from '@/lib/api/http';
import {
   getSetting,
   isSettingKey,
   putSetting,
   SETTING_DEFAULTS,
   SETTING_SCHEMAS,
   SettingKey,
} from '@/lib/api/workspace-settings.server';

export const dynamic = 'force-dynamic';

// GET /api/settings?key=ai|slas|emojis — any member may read
export async function GET(req: NextRequest) {
   const ctx = await requireContext();
   if (!isContext(ctx)) return ctx;
   const key = req.nextUrl.searchParams.get('key') ?? '';
   if (!isSettingKey(key)) {
      return NextResponse.json(
         { error: 'unknown setting key', available: Object.keys(SETTING_DEFAULTS) },
         { status: 400 }
      );
   }
   return NextResponse.json(await getSetting(ctx.orgId, key));
}

// PUT /api/settings   { key, value } — admin only
export async function PUT(req: NextRequest) {
   const ctx = await requireAdmin();
   if (!isContext(ctx)) return ctx;

   try {
      const body = await parseBody(
         req,
         z.object({
            key: z.string().refine(isSettingKey, 'unknown setting key'),
            value: z.unknown(),
         })
      );
      // validate against the key's own schema for a precise error
      const key = body.key as SettingKey;
      SETTING_SCHEMAS[key].parse(body.value);
      await putSetting(ctx.orgId, key, body.value);
      return NextResponse.json(await getSetting(ctx.orgId, key));
   } catch (err) {
      return errorResponse(err);
   }
}
