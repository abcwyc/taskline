'use server';

import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { ensureWorkspace } from '@/lib/api/bootstrap';
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

   if (!email.includes('@') || password.length < 8) {
      redirect('/sign-up?error=invalid');
   }
   if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
      redirect('/sign-up?error=exists');
   }

   const org = await ensureWorkspace();
   const isFirstMember = (await db.membership.count({ where: { orgId: org.id } })) === 0;

   await db.user.create({
      data: {
         email,
         name,
         passwordHash: bcrypt.hashSync(password, 10),
         memberships: {
            create: { orgId: org.id, role: isFirstMember ? 'ADMIN' : 'MEMBER' },
         },
      },
   });

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
