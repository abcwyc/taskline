import { redirect } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/auth';
import { signUpAction } from '@/lib/auth-actions';

export const metadata = { title: 'Create account' };

const ERRORS: Record<string, string> = {
   invalid: 'Enter a valid email and a password of at least 8 characters.',
   exists: 'An account with that email already exists.',
};

export default async function SignUpPage({
   searchParams,
}: {
   searchParams: Promise<{ error?: string }>;
}) {
   const session = await auth();
   if (session?.user) redirect('/');
   const { error } = await searchParams;

   return (
      <div className="min-h-svh flex items-center justify-center bg-background px-4">
         <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-2">
               <div className="flex size-7 items-center justify-center rounded bg-orange-500 text-sm font-semibold text-white">
                  C
               </div>
               <span className="text-lg font-semibold">Circle</span>
            </div>

            <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
               The first account becomes the workspace admin.
            </p>

            {error && (
               <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {ERRORS[error] ?? 'Could not create the account.'}
               </p>
            )}

            <form action={signUpAction} className="mt-6 flex flex-col gap-4">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" autoComplete="name" placeholder="Ada Lovelace" />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                     id="email"
                     name="email"
                     type="email"
                     autoComplete="email"
                     required
                     placeholder="you@example.com"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                     id="password"
                     name="password"
                     type="password"
                     autoComplete="new-password"
                     required
                     minLength={8}
                  />
               </div>
               <Button type="submit" className="mt-2 w-full">
                  Create account
               </Button>
            </form>

            <p className="mt-4 text-sm text-muted-foreground">
               Already have an account?{' '}
               <Link href="/sign-in" className="text-foreground underline">
                  Sign in
               </Link>
            </p>
         </div>
      </div>
   );
}
