import { describe, expect, it } from 'vitest';

import { browserLocale, translate } from '@/lib/i18n';
import { formatProjectDate, projectStatusLabel } from '@/lib/project-localization';

describe('language resolution', () => {
   it('uses Simplified Chinese for Chinese browser languages', () => {
      expect(browserLocale(['zh-TW', 'en-US'])).toBe('zh-CN');
      expect(browserLocale(['en-US'])).toBe('en');
   });

   it('keeps English as the source language and translates known Chinese strings', () => {
      expect(translate('en', 'Projects')).toBe('Projects');
      expect(translate('zh-CN', 'Projects')).toBe('项目');
      expect(translate('zh-CN', 'Unregistered copy')).toBe('Unregistered copy');
   });
});

describe('project localization', () => {
   it('localizes project values and dates without changing English fallbacks', () => {
      expect(projectStatusLabel('en', 'in-progress', 'In Progress')).toBe('In Progress');
      expect(projectStatusLabel('zh-CN', 'in-progress', 'In Progress')).toBe('进行中');
      expect(formatProjectDate('en', '2026-09-07')).toBe('Sep 7');
      expect(formatProjectDate('zh-CN', '2026-09-07')).toBe('9月7日');
   });
});
