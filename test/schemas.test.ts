import { describe, expect, it } from 'vitest';

import { issueCreate, memberUpdate, meUpdate } from '@/lib/api/schemas';

describe('issueCreate schema', () => {
   it('accepts a minimal valid body', () => {
      expect(issueCreate.parse({ title: 'Hello' })).toEqual({ title: 'Hello' });
   });

   it('trims and requires a non-empty title', () => {
      expect(() => issueCreate.parse({ title: '   ' })).toThrow();
      expect(() => issueCreate.parse({})).toThrow();
   });

   it('caps title length', () => {
      expect(() => issueCreate.parse({ title: 'a'.repeat(301) })).toThrow();
   });

   it('rejects unknown fields (strict)', () => {
      expect(() => issueCreate.parse({ title: 'x', evil: 1 })).toThrow();
   });

   it('rejects a malformed id', () => {
      expect(() => issueCreate.parse({ title: 'x', projectId: 'has spaces!' })).toThrow();
   });

   it('rejects a non-ISO due date', () => {
      expect(() => issueCreate.parse({ title: 'x', dueDate: 'tomorrow' })).toThrow();
      expect(issueCreate.parse({ title: 'x', dueDate: '2026-01-02' }).dueDate).toBe('2026-01-02');
   });
});

describe('memberUpdate schema', () => {
   it('only allows the three role keys', () => {
      expect(memberUpdate.parse({ role: 'Admin' }).role).toBe('Admin');
      expect(() => memberUpdate.parse({ role: 'Superuser' })).toThrow();
   });
});

describe('meUpdate schema', () => {
   it('accepts a preferences object and rejects extras', () => {
      expect(meUpdate.parse({ preferences: { autoAssignSelf: true } })).toBeTruthy();
      expect(() => meUpdate.parse({ nope: 1 })).toThrow();
   });
});
