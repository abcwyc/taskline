import { describe, expect, it } from 'vitest';

import {
   base32Decode,
   base32Encode,
   currentTotpCode,
   generateTotpSecret,
   verifyTotp,
} from '@/lib/api/totp';

describe('totp', () => {
   it('base32 round-trips arbitrary bytes', () => {
      const bytes = crypto.getRandomValues(new Uint8Array(20));
      expect(Buffer.from(base32Decode(base32Encode(Buffer.from(bytes))))).toEqual(
         Buffer.from(bytes)
      );
   });

   it('verifies a freshly generated code', () => {
      const secret = generateTotpSecret();
      expect(secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(verifyTotp(secret, currentTotpCode(secret))).toBe(true);
   });

   it('rejects codes minted from a different secret', () => {
      const secret = generateTotpSecret();
      const other = generateTotpSecret();
      expect(currentTotpCode(secret) === currentTotpCode(other)).toBe(false);
      expect(verifyTotp(secret, currentTotpCode(other))).toBe(false);
   });

   it('rejects malformed codes', () => {
      const secret = generateTotpSecret();
      expect(verifyTotp(secret, 'abcdef')).toBe(false);
      expect(verifyTotp(secret, '12345')).toBe(false);
      expect(verifyTotp(secret, '')).toBe(false);
      expect(verifyTotp(generateTotpSecret(), currentTotpCode(generateTotpSecret()))).toBe(false);
   });
});
