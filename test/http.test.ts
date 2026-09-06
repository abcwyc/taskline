import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { errorResponse, parseBody, PublicError } from '@/lib/api/http';
import { DEFAULT_PREFERENCES, normalizePreferences } from '@/lib/api/preferences';

describe('errorResponse', () => {
   it('surfaces a PublicError message + status', async () => {
      const res = errorResponse(new PublicError('nope', 403));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'nope' });
   });

   it('turns a Zod error into a 400', async () => {
      let res!: Response;
      try {
         z.object({ a: z.string() }).parse({});
      } catch (e) {
         res = errorResponse(e);
      }
      expect(res.status).toBe(400);
   });

   it('hides an arbitrary error as a generic 500', async () => {
      const res = errorResponse(new Error('PrismaClientKnownRequestError: secret internals'));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'something went wrong' });
   });
});

describe('parseBody', () => {
   const req = (body: unknown) =>
      new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

   it('validates against the schema', async () => {
      const out = await parseBody(req({ n: 1 }), z.object({ n: z.number() }));
      expect(out).toEqual({ n: 1 });
   });

   it('rejects a non-JSON body with a PublicError', async () => {
      const bad = new Request('http://x', { method: 'POST', body: 'not json' });
      await expect(parseBody(bad, z.object({}))).rejects.toBeInstanceOf(PublicError);
   });
});

describe('normalizePreferences', () => {
   it('fills defaults and drops unknown keys', () => {
      const out = normalizePreferences({ autoAssignSelf: true, evil: 'x', fontSize: 'large' });
      expect(out.autoAssignSelf).toBe(true);
      expect(out.fontSize).toBe('large');
      expect(out.submitCommentOn).toBe(DEFAULT_PREFERENCES.submitCommentOn);
      expect('evil' in out).toBe(false);
   });

   it('ignores wrong-typed values', () => {
      const out = normalizePreferences({ autoAssignSelf: 'yes' });
      expect(out.autoAssignSelf).toBe(false);
   });
});
