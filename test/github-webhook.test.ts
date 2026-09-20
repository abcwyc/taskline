import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { extractIssueIdentifiers, verifyGithubSignature } from '@/lib/api/github-webhook.server';

const sign = (secret: string, body: string) =>
   'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');

describe('github webhook signature', () => {
   const secret = 'whsec_test';
   const body = JSON.stringify({ action: 'opened', zen: 'Design for failure.' });

   it('accepts a valid signature', () => {
      expect(verifyGithubSignature(secret, body, sign(secret, body))).toBe(true);
   });

   it('rejects a tampered body, wrong secret and malformed headers', () => {
      expect(verifyGithubSignature(secret, body + ' ', sign(secret, body))).toBe(false);
      expect(verifyGithubSignature(secret, body, sign('other', body))).toBe(false);
      expect(verifyGithubSignature(secret, body, null)).toBe(false);
      expect(verifyGithubSignature(secret, body, 'sha1=deadbeef')).toBe(false);
      expect(verifyGithubSignature(secret, body, 'sha256=not-hex!')).toBe(false);
   });
});

describe('issue identifier extraction', () => {
   it('finds identifiers in title, body and branch name', () => {
      expect(extractIssueIdentifiers('Fix LNUI-701 crash on sign-in')).toEqual(['LNUI-701']);
      expect(extractIssueIdentifiers('closes lnui-702, refs ABC9-3', null)).toEqual([
         'LNUI-702',
         'ABC9-3',
      ]);
      expect(extractIssueIdentifiers('alexz/lnui-703-add-estimate-field')).toEqual(['LNUI-703']);
   });

   it('de-duplicates across sources and caps the count', () => {
      const many = extractIssueIdentifiers(
         'LNUI-1 lnui-1 LNUI-2 and ' + Array.from({ length: 30 }, (_, i) => `AB-${i}`).join(' ')
      );
      expect(many[0]).toBe('LNUI-1');
      expect(many).toContain('LNUI-2');
      expect(many.length).toBeLessThanOrEqual(20);
   });

   it('ignores anything that is not a prefix-number pair', () => {
      expect(extractIssueIdentifiers('version 1.2-3 and 123-45 and -LNUI-x')).toEqual([]);
      expect(extractIssueIdentifiers('', null, undefined)).toEqual([]);
   });
});
