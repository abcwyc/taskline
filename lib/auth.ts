import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

import { db } from '@/lib/db';
import { authConfig } from '@/lib/auth.config';
import { rateLimit } from '@/lib/api/rate-limit';
import { verifyTotp } from '@/lib/api/totp';
import { verifyAuthentication } from '@/lib/api/passkeys.server';

/**
 * Full Auth.js setup (Node runtime — imports Prisma + bcrypt).
 *
 * Credentials provider = email + password (bcrypt). JWT sessions, so the
 * Account/Session tables aren't used yet; they're kept in the schema for adding
 * OAuth later (drop in a provider + `PrismaAdapter(db)` and switch to database
 * sessions if desired).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
   ...authConfig,
   callbacks: {
      ...authConfig.callbacks,
      async jwt({ token, user }) {
         if (user?.id) {
            token.uid = user.id;
            if ('sessionVersion' in user) token.sessionVersion = Number(user.sessionVersion);
         }
         if (token.uid) {
            const current = await db.user.findUnique({
               where: { id: String(token.uid) },
               select: { sessionVersion: true },
            });
            if (!current || current.sessionVersion !== Number(token.sessionVersion ?? 0)) {
               token.revoked = true;
            }
         }
         return token;
      },
      async session({ session, token }) {
         if (token.revoked) {
            return { ...session, user: undefined as never };
         }
         if (token.uid && session.user) {
            session.user.id = String(token.uid);
            session.user.sessionVersion = Number(token.sessionVersion ?? 0);
         }
         return session;
      },
   },
   providers: [
      Credentials({
         credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
            totp: { label: 'Two-factor code', type: 'text' },
         },
         async authorize(raw, request) {
            const email = String(raw?.email ?? '')
               .trim()
               .toLowerCase();
            const password = String(raw?.password ?? '');
            if (!email || !password) return null;

            // Throttle here (not just in signInAction) so the raw Auth.js
            // callback route can't be hammered directly. Email is the primary
            // key — it can't be forged the way X-Forwarded-For can.
            const ip = (request?.headers?.get('x-forwarded-for')?.split(',')[0] ?? 'local').trim();
            if (
               !rateLimit(`authorize:email:${email}`, { windowMs: 15 * 60_000, max: 10 }) ||
               !rateLimit(`authorize:ip:${ip}`, { windowMs: 5 * 60_000, max: 50 })
            ) {
               return null;
            }

            const user = await db.user.findUnique({
               where: { email },
               select: {
                  id: true,
                  email: true,
                  name: true,
                  avatarUrl: true,
                  sessionVersion: true,
                  passwordHash: true,
                  mfaEnabled: true,
                  totpSecret: true,
               },
            });
            if (!user?.passwordHash) return null;

            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return null;

            if (user.mfaEnabled) {
               const totp = String(raw?.totp ?? '');
               if (!totp || !user.totpSecret || !verifyTotp(user.totpSecret, totp)) {
                  return null;
               }
            }

            return {
               id: user.id,
               email: user.email,
               name: user.name,
               image: user.avatarUrl,
               sessionVersion: user.sessionVersion,
            };
         },
      }),
      Credentials({
         id: 'passkey',
         credentials: {
            assertion: { label: 'Assertion', type: 'text' },
         },
         async authorize(raw, request) {
            const ip = (request?.headers?.get('x-forwarded-for')?.split(',')[0] ?? 'local').trim();
            if (!rateLimit(`passkey:ip:${ip}`, { windowMs: 5 * 60_000, max: 50 })) return null;

            let assertion: Parameters<typeof verifyAuthentication>[0];
            try {
               assertion = JSON.parse(String(raw?.assertion ?? '')) as typeof assertion;
            } catch {
               return null;
            }
            const userId = await verifyAuthentication(assertion);
            if (!userId) return null;
            const user = await db.user.findUnique({
               where: { id: userId },
               select: {
                  id: true,
                  email: true,
                  name: true,
                  avatarUrl: true,
                  sessionVersion: true,
               },
            });
            if (!user) return null;
            return {
               id: user.id,
               email: user.email,
               name: user.name,
               image: user.avatarUrl,
               sessionVersion: user.sessionVersion,
            };
         },
      }),
   ],
});
