import { describe, expect, it } from 'vitest';

import { issueCreate, issueUpdate } from '@/lib/api/schemas';

describe('issue estimate schema', () => {
   it('accepts a valid estimate on create and update', () => {
      expect(issueCreate.safeParse({ title: 'x', estimate: 3 }).success).toBe(true);
      expect(issueCreate.safeParse({ title: 'x', estimate: 0.5 }).success).toBe(true);
      expect(issueCreate.safeParse({ title: 'x', estimate: null }).success).toBe(true);
      expect(issueUpdate.safeParse({ estimate: 21 }).success).toBe(true);
   });

   it('does not require an estimate', () => {
      expect(issueCreate.safeParse({ title: 'x' }).success).toBe(true);
      expect(issueUpdate.safeParse({}).success).toBe(true);
   });

   it('rejects negative, oversized and fractional estimates', () => {
      expect(issueUpdate.safeParse({ estimate: -1 }).success).toBe(false);
      expect(issueUpdate.safeParse({ estimate: 1001 }).success).toBe(false);
      expect(issueUpdate.safeParse({ estimate: 2.25 }).success).toBe(false);
   });
});
