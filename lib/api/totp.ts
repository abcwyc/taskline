import { createHmac, randomBytes } from 'node:crypto';

/**
 * RFC 6238 TOTP (SHA-1, 6 digits, 30s period) + base32 helpers, implemented
 * on node:crypto so MFA needs no extra dependency. Compatible with Google
 * Authenticator / 1Password / Authy otpauth URLs.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
   let bits = 0;
   let value = 0;
   let output = '';
   for (const byte of buf) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
         output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
         bits -= 5;
      }
   }
   if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
   return output;
}

export function base32Decode(input: string): Buffer {
   const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
   let bits = 0;
   let value = 0;
   const bytes: number[] = [];
   for (const char of clean) {
      value = (value << 5) | BASE32_ALPHABET.indexOf(char);
      bits += 5;
      if (bits >= 8) {
         bytes.push((value >>> (bits - 8)) & 0xff);
         bits -= 8;
      }
   }
   return Buffer.from(bytes);
}

/** 160-bit secret, base32-encoded (the standard Authenticator format). */
export function generateTotpSecret(): string {
   return base32Encode(randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
   const buf = Buffer.alloc(8);
   buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
   buf.writeUInt32BE(counter % 2 ** 32, 4);
   const digest = createHmac('sha1', secret).update(buf).digest();
   const offset = digest[digest.length - 1]! & 0x0f;
   const code =
      ((digest[offset]! & 0x7f) << 24) |
      ((digest[offset + 1]! & 0xff) << 16) |
      ((digest[offset + 2]! & 0xff) << 8) |
      (digest[offset + 3]! & 0xff);
   return String(code % 1_000_000).padStart(6, '0');
}

/** The current valid code — used by tests and (future) operator tooling. */
export function currentTotpCode(secretBase32: string): string {
   return hotp(base32Decode(secretBase32), Math.floor(Date.now() / 30_000));
}

/** Verify a 6-digit code with a ±1 step (±30s) clock-skew window. */
export function verifyTotp(secretBase32: string, code: string): boolean {
   if (!/^\d{6}$/.test(code)) return false;
   const secret = base32Decode(secretBase32);
   if (secret.length === 0) return false;
   const step = Math.floor(Date.now() / 30_000);
   // Constant-time-ish: compare all candidates.
   const candidates = [hotp(secret, step - 1), hotp(secret, step), hotp(secret, step + 1)];
   return candidates.includes(code);
}

export function otpauthUrl(secret: string, email: string, issuer = 'Taskline'): string {
   const label = encodeURIComponent(`${issuer}:${email}`);
   const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: '6',
      period: '30',
   });
   return `otpauth://totp/${label}?${params.toString()}`;
}
