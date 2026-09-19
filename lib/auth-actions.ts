'use server';

import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createDirectAccount, DirectSignupError } from '@/lib/api/bootstrap';
import { rateLimit } from '@/lib/api/rate-limit';
import { secretsEqual } from '@/lib/api/secrets';
import {
   claimInvite,
   finalizeInvite,
   getInviteByToken,
   releaseInvite,
} from '@/lib/api/invites.server';
import { signIn, signOut } from '@/lib/auth';
import { db } from '@/lib/db';

async function clientIp(): Promise<string> {
   const h = await headers();
   return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'local').trim();
}

export async function signInAction(formData: FormData) {
   const callbackUrl = String(formData.get('callbackUrl') || '/');
   const ip = await clientIp();
   const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase();
   if (
      !rateLimit(`signin:ip:${ip}`, { windowMs: 5 * 60_000, max: 20 }) ||
      !rateLimit(`signin:email:${email}`, { windowMs: 15 * 60_000, max: 10 })
   ) {
      redirect('/sign-in?error=RateLimited');
   }
   try {
      await signIn('credentials', {
         email: formData.get('email'),
         password: formData.get('password'),
         totp: formData.get('totp') ?? undefined,
         redirectTo: callbackUrl.startsWith('/') ? callbackUrl : '/',
      });
   } catch (err) {
      // signIn throws a redirect on success — only swallow real auth failures
      if (err instanceof AuthError) redirect('/sign-in?error=CredentialsSignin');
      throw err;
   }
}

export async function signUpAction(formData: FormData) {
   const ip = await clientIp();
   if (!rateLimit(`signup:ip:${ip}`, { windowMs: 10 * 60_000, max: 8 })) {
      redirect('/sign-up?error=ratelimited');
   }
   const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase();
   const password = String(formData.get('password') ?? '');
   const name = String(formData.get('name') ?? '').trim() || email.split('@')[0];
   const token = String(formData.get('invite') ?? '').trim();
   const bootstrapArg = String(formData.get('bootstrap') ?? '').trim();
   // invite-only unless explicitly opened
   const openSignup = process.env.SIGNUP_MODE === 'open';
   const bootstrapSecret = process.env.BOOTSTRAP_SECRET?.trim();

   const invite = token ? await getInviteByToken(token) : null;
   const qs = token ? `&invite=${encodeURIComponent(token)}` : '';

   if (token && !invite) redirect('/sign-up?error=badinvite');
   if (invite?.email && invite.email !== email) redirect(`/sign-up?error=inviteemail${qs}`);

   if (!email.includes('@') || password.length < 8) {
      redirect(`/sign-up?error=invalid${qs}`);
   }
   let userId: string;
   const passwordHash = bcrypt.hashSync(password, 10);
   if (invite) {
      if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
         redirect(`/sign-up?error=exists${qs}`);
      }

      // Atomically claim the invite before we create anything, so a link that
      // two people open at once is redeemed exactly once.
      if (!(await claimInvite(token))) redirect('/sign-up?error=badinvite');

      try {
         const user = await db.user.create({
            data: {
               email,
               name,
               passwordHash,
               memberships: {
                  create: {
                     orgId: invite.orgId,
                     role: invite.role === 'GUEST' ? 'GUEST' : 'MEMBER',
                  },
               },
            },
            select: { id: true },
         });
         userId = user.id;
      } catch (err) {
         await releaseInvite(token);
         throw err;
      }
      await finalizeInvite(token, userId);
   } else {
      try {
         const result = await createDirectAccount(
            { email, name, passwordHash },
            {
               openSignup,
               bootstrapAuthorized: Boolean(
                  bootstrapSecret && secretsEqual(bootstrapArg, bootstrapSecret)
               ),
            }
         );
         userId = result.user.id;
      } catch (err) {
         if (err instanceof DirectSignupError) redirect(`/sign-up?error=${err.code}`);
         throw err;
      }
   }

   try {
      await signIn('credentials', { email, password, redirectTo: '/' });
   } catch (err) {
      if (err instanceof AuthError) redirect('/sign-in');
      throw err;
   }
}

export async function signOutAction() {
   await signOut({ redirectTo: '/sign-in' });
}
