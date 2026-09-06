import { redirect } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/auth';
import { signInAction } from '@/lib/auth-actions';

export const metadata = { title: 'Sign in' };

interface SignInPageProps {
   searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
   const session = await auth();
   if (session?.user) redirect('/');

   const { callbackUrl = '/', error } = await searchParams;

   return (
      <div className="min-h-svh flex items-center justify-center bg-background px-4">
         <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-2">
               <div className="flex size-7 items-center justify-center rounded bg-orange-500 text-sm font-semibold text-white">
                  C
               </div>
               <span className="text-lg font-semibold">Circle</span>
            </div>

            <h1 className="text-xl font-semibold tracking-tight">Sign in to your workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use your email and password.</p>

            {error && (
               <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error === 'RateLimited'
                     ? 'Too many attempts. Wait a few minutes and try again.'
                     : 'Incorrect email or password.'}
               </p>
            )}

            <form action={signInAction} className="mt-6 flex flex-col gap-4">
               <input type="hidden" name="callbackUrl" value={callbackUrl} />
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                     id="email"
                     name="email"
                     type="email"
                     autoComplete="email"
                     required
                     autoFocus
                     placeholder="you@example.com"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                     id="password"
                     name="password"
                     type="password"
                     autoComplete="current-password"
                     required
                  />
               </div>
               <Button type="submit" className="mt-2 w-full">
                  Sign in
               </Button>
            </form>

            <p className="mt-4 text-sm text-muted-foreground">
               Need an account?{' '}
               <Link href="/sign-up" className="text-foreground underline">
                  Create one
               </Link>
            </p>
         </div>
      </div>
   );
}
