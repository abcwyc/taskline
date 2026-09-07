import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison for operator-provided secrets. Hashing first makes
 * both buffers the same length without leaking the configured secret length.
 */
export function secretsEqual(provided: string, expected: string): boolean {
   const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();
   return timingSafeEqual(digest(provided), digest(expected));
}

/** 256 bits of entropy, encoded without characters that need URL escaping. */
export function createOpaqueToken(): string {
   return randomBytes(32).toString('base64url');
}
