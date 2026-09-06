'use server';

import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { ensureWorkspace } from '@/lib/api/bootstrap';
import { getInviteByToken, markInviteAccepted } from '@/lib/api/invites.server';
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
   const inviteOnly = process.env.SIGNUP_MODE === 'invite';

   const invite = token ? await getInviteByToken(token) : null;
   const qs = token ? `&invite=${encodeURIComponent(token)}` : '';

   // The very first account always gets through (it becomes the admin) — even in
   // invite-only mode, otherwise a fresh deploy could never be bootstrapped.
   const isBootstrap = (await db.user.count()) === 0;

   if (token && !invite) redirect('/sign-up?error=badinvite');
   if (inviteOnly && !invite && !isBootstrap) redirect('/sign-up?error=inviteonly');
   if (invite?.email && invite.email !== email) redirect(`/sign-up?error=inviteemail${qs}`);

   if (!email.includes('@') || password.length < 8) {
      redirect(`/sign-up?error=invalid${qs}`);
   }
   if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
      redirect(`/sign-up?error=exists${qs}`);
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

   const user = await db.user.create({
      data: {
         email,
         name,
         passwordHash: bcrypt.hashSync(password, 10),
         memberships: { create: { orgId, role } },
      },
      select: { id: true },
   });
   if (token) await markInviteAccepted(token, user.id);

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
