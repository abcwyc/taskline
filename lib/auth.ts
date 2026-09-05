import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

import { db } from '@/lib/db';
import { authConfig } from '@/lib/auth.config';

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
   providers: [
      Credentials({
         credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
         },
         async authorize(raw) {
            const email = String(raw?.email ?? '')
               .trim()
               .toLowerCase();
            const password = String(raw?.password ?? '');
            if (!email || !password) return null;

            const user = await db.user.findUnique({ where: { email } });
            if (!user?.passwordHash) return null;

            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return null;

            return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl };
         },
      }),
   ],
});
