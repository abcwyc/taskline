import { describe, expect, it } from 'vitest';

import { SETTING_DEFAULTS, SETTING_SCHEMAS } from '@/lib/api/workspace-settings.server';

describe('workspace setting schemas', () => {
   it('accepts and normalizes valid payloads', () => {
      expect(
         SETTING_SCHEMAS.ai.safeParse({ enabled: true, model: 'gpt-4o-mini', systemPrompt: '' })
            .success
      ).toBe(true);
      expect(
         SETTING_SCHEMAS.slas.safeParse([{ priority: 'urgent', respondHours: 4, resolveHours: 24 }])
            .success
      ).toBe(true);
      expect(SETTING_SCHEMAS.emojis.safeParse([{ name: 'ship', emoji: '🚀' }]).success).toBe(true);
   });

   it('rejects malformed payloads', () => {
      expect(
         SETTING_SCHEMAS.slas.safeParse([
            { priority: 'critical', respondHours: 1, resolveHours: 1 },
         ]).success
      ).toBe(false);
      expect(SETTING_SCHEMAS.ai.safeParse({ enabled: 'yes' }).success).toBe(false);
      expect(SETTING_SCHEMAS.emojis.safeParse([{ name: '', emoji: 'x' }]).success).toBe(false);
   });

   it('defaults are schema-valid', () => {
      for (const key of Object.keys(SETTING_SCHEMAS) as (keyof typeof SETTING_SCHEMAS)[]) {
         expect(SETTING_SCHEMAS[key].safeParse(SETTING_DEFAULTS[key]).success, key).toBe(true);
      }
   });
});
