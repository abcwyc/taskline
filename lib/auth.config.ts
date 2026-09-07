import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe Auth.js config — no database / bcrypt imports. Used by
 * `middleware.ts` for the route guard and spread into the full config in
 * `lib/auth.ts`. Provider `authorize` logic lives in `lib/auth.ts` (Node only).
 */
export const authConfig = {
   pages: { signIn: '/sign-in' },
   session: { strategy: 'jwt' },
   providers: [],
   callbacks: {
      authorized({ auth, request }) {
         const { pathname } = request.nextUrl;
         if (pathname === '/sign-in' || pathname === '/sign-up') return true;
         return Boolean(auth?.user);
      },
      jwt({ token, user }) {
         if (user?.id) token.uid = user.id;
         if (user && 'sessionVersion' in user) {
            token.sessionVersion = Number(user.sessionVersion);
         }
         return token;
      },
      session({ session, token }) {
         if (token.uid && session.user) {
            session.user.id = String(token.uid);
            session.user.sessionVersion = Number(token.sessionVersion ?? 0);
         }
         return session;
      },
   },
} satisfies NextAuthConfig;
