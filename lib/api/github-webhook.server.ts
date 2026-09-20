import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * GitHub webhook helpers — signature verification and issue-identifier
 * extraction. Pure functions, unit-tested in `test/github-webhook.test.ts`.
 */

/** Constant-time check of GitHub's `x-hub-signature-256` header against the raw body. */
export function verifyGithubSignature(
   secret: string,
   rawBody: string,
   signatureHeader: string | null
): boolean {
   if (!signatureHeader?.startsWith('sha256=')) return false;
   const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
   const provided = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');
   // different lengths must not reach timingSafeEqual (it throws)
   if (expected.length !== provided.length) return false;
   return timingSafeEqual(expected, provided);
}

/**
 * Issue identifiers mentioned in a PR title, body or branch name, e.g.
 * "LNUI-701" or the lowercase branch form "lnui-701-fix-dialog".
 * Returns upper-cased, de-duplicated identifiers (capped at 20).
 */
export function extractIssueIdentifiers(...sources: (string | null | undefined)[]): string[] {
   const found: string[] = [];
   for (const source of sources) {
      if (!source) continue;
      for (const match of source.matchAll(/\b([a-z][a-z0-9]{0,15})-(\d{1,10})\b/gi)) {
         const identifier = `${match[1]}-${match[2]}`.toUpperCase();
         if (!found.includes(identifier)) found.push(identifier);
         if (found.length >= 20) return found;
      }
   }
   return found;
}
