'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { signIn, signOut } from '@/lib/auth';

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

export async function signOutAction() {
   await signOut({ redirectTo: '/sign-in' });
}
