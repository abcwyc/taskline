import { redirect } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getInviteByToken } from '@/lib/api/invites.server';
import { auth } from '@/lib/auth';
import { signUpAction } from '@/lib/auth-actions';
import { db } from '@/lib/db';

export const metadata = { title: 'Create account' };

const ERRORS: Record<string, string> = {
   invalid: 'Enter a valid email and a password of at least 8 characters.',
   exists: 'An account with that email already exists.',
   badinvite: 'That invite link is invalid or has already been used.',
   inviteonly: 'This workspace is invite-only. Ask an admin for an invite link.',
   inviteemail: 'This invite was issued for a different email address.',
   bootstrap: 'A valid bootstrap secret is required to create the first account.',
};

export default async function SignUpPage({
   searchParams,
}: {
   searchParams: Promise<{ error?: string; invite?: string; bootstrap?: string }>;
}) {
   const session = await auth();
   if (session?.user) redirect('/');
   const { error, invite: token, bootstrap } = await searchParams;

   const invite = token ? await getInviteByToken(token) : null;
   const noUsersYet = (await db.user.count()) === 0;
   const bootstrapSecret = process.env.BOOTSTRAP_SECRET?.trim();
   const canBootstrap = noUsersYet && (!bootstrapSecret || bootstrap === bootstrapSecret);
   // invite-only unless explicitly opened
   const inviteOnly = process.env.SIGNUP_MODE !== 'open' && !canBootstrap;
   const blocked = (inviteOnly && !invite) || (!!token && !invite);

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
               {invite
                  ? `You've been invited to join ${invite.orgName}.`
                  : canBootstrap
                    ? 'The first account becomes the workspace admin.'
                    : inviteOnly
                      ? 'This workspace is invite-only.'
                      : 'The first account becomes the workspace admin.'}
            </p>

            {error && (
               <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {ERRORS[error] ?? 'Could not create the account.'}
               </p>
            )}

            {blocked ? (
               <p className="mt-6 rounded-md border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                  {token
                     ? 'That invite link is invalid or has expired.'
                     : 'You need an invitation to join this workspace.'}
               </p>
            ) : (
               <form action={signUpAction} className="mt-6 flex flex-col gap-4">
                  {token && <input type="hidden" name="invite" value={token} />}
                  {bootstrap && <input type="hidden" name="bootstrap" value={bootstrap} />}
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
                        defaultValue={invite?.email ?? undefined}
                        readOnly={!!invite?.email}
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
            )}

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
