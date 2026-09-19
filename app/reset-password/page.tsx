'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function ResetPasswordForm() {
   const params = useSearchParams();
   const router = useRouter();
   const [password, setPassword] = useState('');
   const [confirm, setConfirm] = useState('');
   const [error, setError] = useState<string | null>(null);
   const [busy, setBusy] = useState(false);

   const submit = async () => {
      setError(null);
      if (password.length < 8) {
         setError('Password must be at least 8 characters.');
         return;
      }
      if (password !== confirm) {
         setError('Passwords do not match.');
         return;
      }
      setBusy(true);
      try {
         const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token: params.get('token') ?? '', password }),
         });
         if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            setError(body.error ?? 'The link is invalid or expired.');
            return;
         }
         router.push('/sign-in');
      } finally {
         setBusy(false);
      }
   };

   return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
         <div className="w-full max-w-sm rounded-lg border bg-container p-6">
            <h1 className="text-lg font-semibold">Choose a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
               Your reset link is single-use and expires 30 minutes after it was created.
            </p>
            <div className="mt-4 flex flex-col gap-3">
               <Input
                  type="password"
                  placeholder="New password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
               />
               <Input
                  type="password"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
               />
               {error && <p className="text-sm text-red-500">{error}</p>}
               <Button onClick={submit} disabled={busy}>
                  {busy ? 'Saving…' : 'Reset password'}
               </Button>
            </div>
         </div>
      </main>
   );
}

export default function ResetPasswordPage() {
   return (
      <Suspense>
         <ResetPasswordForm />
      </Suspense>
   );
}
