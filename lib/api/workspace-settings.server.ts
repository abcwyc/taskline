import 'server-only';
import { z } from 'zod';

import { db } from '@/lib/db';

/**
 * Admin-managed workspace settings, persisted as typed JSON documents under
 * `WorkspaceSetting`. Each key has its own zod schema; unknown keys are
 * rejected, malformed stored values fall back to the documented default.
 */

export const AI_DEFAULT = { enabled: false, model: '', systemPrompt: '' };
export const GITHUB_DEFAULT = { autoDone: true };
export const SLAS_DEFAULT = [
   { priority: 'urgent', respondHours: 4, resolveHours: 24 },
   { priority: 'high', respondHours: 12, resolveHours: 72 },
   { priority: 'medium', respondHours: 24, resolveHours: 168 },
   { priority: 'low', respondHours: 72, resolveHours: 336 },
];
export const EMOJIS_DEFAULT: { name: string; emoji: string }[] = [];

const aiSchema = z.object({
   enabled: z.boolean(),
   model: z.string().max(200),
   systemPrompt: z.string().max(4_000),
});
const slaSchema = z.array(
   z.object({
      priority: z.enum(['urgent', 'high', 'medium', 'low']),
      respondHours: z.number().int().min(1).max(2_000),
      resolveHours: z.number().int().min(1).max(10_000),
   })
);
const emojisSchema = z.array(
   z.object({ name: z.string().trim().min(1).max(40), emoji: z.string().min(1).max(16) })
);
const githubSchema = z.object({
   // Move issues to a COMPLETED workflow state when a linked PR is merged.
   autoDone: z.boolean(),
});

export const SETTING_SCHEMAS = {
   ai: aiSchema,
   slas: slaSchema,
   emojis: emojisSchema,
   github: githubSchema,
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;

export const SETTING_DEFAULTS: Record<SettingKey, unknown> = {
   ai: AI_DEFAULT,
   slas: SLAS_DEFAULT,
   emojis: EMOJIS_DEFAULT,
   github: GITHUB_DEFAULT,
};

export function isSettingKey(key: string): key is SettingKey {
   return key in SETTING_SCHEMAS;
}

export async function getSetting(orgId: string, key: SettingKey): Promise<unknown> {
   const row = await db.workspaceSetting.findUnique({
      where: { orgId_key: { orgId, key } },
      select: { value: true },
   });
   const parsed = row ? SETTING_SCHEMAS[key].safeParse(row.value) : null;
   return parsed?.success ? parsed.data : SETTING_DEFAULTS[key];
}

export async function putSetting(orgId: string, key: SettingKey, value: unknown): Promise<void> {
   const parsed = SETTING_SCHEMAS[key].parse(value);
   await db.workspaceSetting.upsert({
      where: { orgId_key: { orgId, key } },
      create: { orgId, key, value: parsed },
      update: { value: parsed },
   });
}
