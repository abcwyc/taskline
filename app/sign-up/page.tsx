import { redirect } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TParams } from '@/components/providers/t-params';
import { T } from '@/components/providers/t';
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
   bootstrap: 'The bootstrap secret was missing or incorrect.',
   ratelimited: 'Too many sign-up attempts. Wait a few minutes and try again.',
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
   const hasBootstrapSecret = Boolean(process.env.BOOTSTRAP_SECRET?.trim());
   const openSignup = process.env.SIGNUP_MODE === 'open';

   // First-run: only a valid invite or the bootstrap secret gets you in.
   const firstRun = noUsersYet && !invite;
   const bootstrapClosed = firstRun && !hasBootstrapSecret;
   const askBootstrap = firstRun && hasBootstrapSecret;
   const inviteWall = !noUsersYet && !openSignup && !invite;
   const blocked = bootstrapClosed || inviteWall || (!!token && !invite);

   return (
      <div className="min-h-svh flex items-center justify-center bg-background px-4">
         <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-2">
               <div className="flex size-7 items-center justify-center rounded bg-orange-500 text-sm font-semibold text-white">
                  C
               </div>
               <span className="text-lg font-semibold">Circle</span>
            </div>

            <h1 className="text-xl font-semibold tracking-tight">
               <T k="Create your account" />
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
               {invite ? (
                  <TParams
                     k="You've been invited to join {org}."
                     params={{ org: invite.orgName }}
                  />
               ) : askBootstrap ? (
                  <T k="Enter the bootstrap secret to create the first admin." />
               ) : inviteWall ? (
                  <T k="This workspace is invite-only." />
               ) : (
                  <T k="The first account becomes the workspace admin." />
               )}
            </p>

            {error && (
               <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <T k={ERRORS[error] ?? 'Could not create the account.'} />
               </p>
            )}

            {blocked ? (
               <p className="mt-6 rounded-md border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                  {token ? (
                     <T k="That invite link is invalid or has already been used." />
                  ) : bootstrapClosed ? (
                     <T k="Web sign-up is closed. Create the first admin with `pnpm create-admin` (or set BOOTSTRAP_SECRET)." />
                  ) : (
                     <T k="You need an invitation to join this workspace." />
                  )}
               </p>
            ) : (
               <form action={signUpAction} className="mt-6 flex flex-col gap-4">
                  {token && <input type="hidden" name="invite" value={token} />}
                  {askBootstrap && (
                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="bootstrap">
                           <T k="Bootstrap secret" />
                        </Label>
                        <Input
                           id="bootstrap"
                           name="bootstrap"
                           type="password"
                           required
                           defaultValue={bootstrap ?? undefined}
                        />
                     </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="name">
                        <T k="Name" />
                     </Label>
                     <Input id="name" name="name" autoComplete="name" placeholder="Ada Lovelace" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="email">
                        <T k="Email" />
                     </Label>
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
                     <Label htmlFor="password">
                        <T k="Password" />
                     </Label>
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
                     <T k="Create account" />
                  </Button>
               </form>
            )}

            <p className="mt-4 text-sm text-muted-foreground">
               <T k="Already have an account?" />{' '}
               <Link href="/sign-in" className="text-foreground underline">
                  <T k="Sign in" />
               </Link>
            </p>
         </div>
      </div>
   );
}
