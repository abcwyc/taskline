import 'server-only';

import {
   generateAuthenticationOptions,
   generateRegistrationOptions,
   verifyAuthenticationResponse,
   verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
   AuthenticationResponseJSON,
   AuthenticatorTransport,
   RegistrationResponseJSON,
} from '@simplewebauthn/server';

import { db } from '@/lib/db';

/**
 * WebAuthn passkeys. Challenges are parked in the Auth.js VerificationToken
 * table (identifier + token + expiry — exactly its shape) and deleted on use.
 */

type transports = AuthenticatorTransport[];

export function rpName(): string {
   return 'Taskline';
}

export function rpID(): string {
   const url = process.env.AUTH_URL || 'http://localhost:3000';
   try {
      return new URL(url).hostname;
   } catch {
      return 'localhost';
   }
}

export function origin(): string {
   return (process.env.AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
}

const CHALLENGE_TTL_MS = 5 * 60_000;

async function storeChallenge(identifier: string, challenge: string): Promise<void> {
   await db.verificationToken.deleteMany({ where: { identifier } });
   await db.verificationToken.create({
      data: { identifier, token: challenge, expires: new Date(Date.now() + CHALLENGE_TTL_MS) },
   });
}

async function takeChallenge(identifier: string): Promise<string | null> {
   const row = await db.verificationToken.findFirst({
      where: { identifier, expires: { gt: new Date() } },
      select: { token: true },
   });
   if (!row) return null;
   await db.verificationToken.deleteMany({ where: { identifier } });
   return row.token;
}

/* ------------------------------- registration ------------------------------- */

export async function registrationOptions(userId: string, email: string, userName: string) {
   const credentials = await db.passkey.findMany({
      where: { userId },
      select: { id: true },
   });
   const options = await generateRegistrationOptions({
      rpName: rpName(),
      rpID: rpID(),
      userID: new TextEncoder().encode(userId) as unknown as Uint8Array<ArrayBuffer>,
      userName: email,
      userDisplayName: userName,
      attestationType: 'none',
      excludeCredentials: credentials.map((c) => ({ id: c.id })),
      authenticatorSelection: {
         residentKey: 'preferred',
         userVerification: 'preferred',
      },
   });
   await storeChallenge(`webauthn-reg:${userId}`, options.challenge);
   return options;
}

export async function verifyRegistration(
   userId: string,
   label: string,
   response: RegistrationResponseJSON
): Promise<{ id: string; label: string; createdAt: string }> {
   const challenge = await takeChallenge(`webauthn-reg:${userId}`);
   if (!challenge) throw new Error('registration challenge expired — try again');

   const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin(),
      expectedRPID: rpID(),
      requireUserVerification: false,
   });
   if (!verification.verified || !verification.registrationInfo) {
      throw new Error('passkey registration could not be verified');
   }
   const { credential } = verification.registrationInfo;
   const row = await db.passkey.create({
      data: {
         id: credential.id,
         userId,
         label: label.trim().slice(0, 60) || 'Passkey',
         publicKey: Buffer.from(credential.publicKey).toString('base64'),
         counter: credential.counter,
         transports: (response.response.transports as transports)?.join(',') ?? null,
      },
   });
   return { id: row.id, label: row.label, createdAt: row.createdAt.toISOString() };
}

/* ------------------------------ authentication ------------------------------ */

export async function authenticationOptions(email?: string) {
   // Email given → constrain to that user's credentials; else allow any
   // discoverable (resident) credential.
   let allow: { id: string }[] = [];
   if (email) {
      const user = await db.user.findUnique({
         where: { email: email.trim().toLowerCase() },
         select: { passkeys: { select: { id: true } } },
      });
      if (user) allow = user.passkeys.map((p) => ({ id: p.id }));
   }
   const options = await generateAuthenticationOptions({
      rpID: rpID(),
      userVerification: 'preferred',
      ...(allow.length ? { allowCredentials: allow } : {}),
   });
   await storeChallenge('webauthn-auth', options.challenge);
   return options;
}

/**
 * Verifies an authentication assertion and returns the owning user id.
 * Returns null when the credential is unknown or verification fails.
 */
export async function verifyAuthentication(
   response: AuthenticationResponseJSON
): Promise<string | null> {
   const passkey = await db.passkey.findUnique({
      where: { id: response.id },
      select: { id: true, userId: true, publicKey: true, counter: true },
   });
   if (!passkey) return null;
   const challenge = await takeChallenge('webauthn-auth');
   if (!challenge) return null;

   const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin(),
      expectedRPID: rpID(),
      credential: {
         id: passkey.id,
         publicKey: new Uint8Array(
            Buffer.from(passkey.publicKey, 'base64')
         ) as unknown as Uint8Array<ArrayBuffer>,
         counter: passkey.counter,
         transports: [],
      },
      requireUserVerification: false,
   });
   if (!verification.verified) return null;

   await db.passkey.update({
      where: { id: passkey.id },
      data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
   });
   return passkey.userId;
}
