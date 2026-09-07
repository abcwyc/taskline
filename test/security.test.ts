import { describe, expect, it } from 'vitest';

import { createOpaqueToken, secretsEqual } from '@/lib/api/secrets';
import { createMutationGuard } from '@/lib/client-mutation';
import { idealCompletion } from '@/lib/api/cycle-burnup.server';

describe('secret utilities', () => {
   it('compares equal and unequal secrets, including different lengths', () => {
      expect(secretsEqual('correct horse battery staple', 'correct horse battery staple')).toBe(
         true
      );
      expect(secretsEqual('correct horse battery staple', 'correct horse battery stapler')).toBe(
         false
      );
      expect(secretsEqual('short', 'a much longer configured secret')).toBe(false);
   });

   it('creates URL-safe 256-bit invitation tokens', () => {
      const tokens = new Set(Array.from({ length: 64 }, () => createOpaqueToken()));
      expect(tokens.size).toBe(64);
      for (const token of tokens) {
         expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      }
   });
});

describe('cycle burn-up', () => {
   const start = new Date('2026-09-01T00:00:00Z');
   const end = new Date('2026-09-11T00:00:00Z');

   it('clamps the ideal line to the cycle range', () => {
      expect(idealCompletion(20, start, end, new Date('2026-08-20T00:00:00Z'))).toBe(0);
      expect(idealCompletion(20, start, end, new Date('2026-09-06T00:00:00Z'))).toBe(10);
      expect(idealCompletion(20, start, end, new Date('2026-09-20T00:00:00Z'))).toBe(20);
   });
});

describe('client mutation guard', () => {
   it('keeps a resource active until its latest mutation finishes', () => {
      const guard = createMutationGuard();
      const first = guard.begin('issue-1');
      const second = guard.begin('issue-1');

      guard.finish('issue-1', first);
      expect(guard.hasActive()).toBe(true);

      guard.finish('issue-1', second);
      expect(guard.hasActive()).toBe(false);
   });
});
