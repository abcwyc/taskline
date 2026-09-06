'use server';

import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { ensureWorkspace } from '@/lib/api/bootstrap';
import {
   claimInvite,
   finalizeInvite,
   getInviteByToken,
   releaseInvite,
} from '@/lib/api/invites.server';
import { signIn, signOut } from '@/lib/auth';
import { db } from '@/lib/db';

export async function signInAction(formData: FormData) {
   const callbackUrl = String(formData.get('callbackUrl') || '/');
   try {
      await signIn('credentials', {
         email: formData.get('email'),
         password: formData.get('password'),
         redirectTo: callbackUrl.startsWith('/') ? callbackUrl : '/',
      });
   } catch (err) {
      // signIn throws a redirect on success — only swallow real auth failures
      if (err instanceof AuthError) redirect('/sign-in?error=CredentialsSignin');
      throw err;
   }
}

export async function signUpAction(formData: FormData) {
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

   // The first-ever account bootstraps the workspace as ADMIN. This is only
   // possible through a valid invite or a correct BOOTSTRAP_SECRET — never
   // "whoever registers first". With no users and no secret, the web sign-up is
   // closed; use `pnpm create-admin` (scripts/create-admin.ts).
   const noUsersYet = (await db.user.count()) === 0;
   const isBootstrap =
      noUsersYet && !invite && !!bootstrapSecret && bootstrapArg === bootstrapSecret;

   if (token && !invite) redirect('/sign-up?error=badinvite');
   if (noUsersYet && !invite && !isBootstrap) redirect('/sign-up?error=bootstrap');
   if (!noUsersYet && !openSignup && !invite) redirect('/sign-up?error=inviteonly');
   if (invite?.email && invite.email !== email) redirect(`/sign-up?error=inviteemail${qs}`);

   if (!email.includes('@') || password.length < 8) {
      redirect(`/sign-up?error=invalid${qs}`);
   }
   if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
      redirect(`/sign-up?error=exists${qs}`);
   }

   // Atomically claim the invite before we create anything, so a link that two
   // people open at once is redeemed exactly once.
   if (invite && !(await claimInvite(token))) {
      redirect('/sign-up?error=badinvite');
   }

   let orgId: string;
   let role: 'ADMIN' | 'MEMBER' | 'GUEST';
   if (invite) {
      orgId = invite.orgId;
      role = invite.role === 'GUEST' ? 'GUEST' : 'MEMBER';
   } else {
      const org = await ensureWorkspace();
      const isFirstMember = (await db.membership.count({ where: { orgId: org.id } })) === 0;
      orgId = org.id;
      role = isFirstMember ? 'ADMIN' : 'MEMBER';
   }

   let userId: string;
   try {
      const user = await db.user.create({
         data: {
            email,
            name,
            passwordHash: bcrypt.hashSync(password, 10),
            memberships: { create: { orgId, role } },
         },
         select: { id: true },
      });
      userId = user.id;
   } catch (err) {
      if (invite) await releaseInvite(token);
      throw err;
   }
   if (invite) await finalizeInvite(token, userId);

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
