'use client';

import { startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/providers/language-provider';

/**
 * Secondary sign-in option on the credentials form: asks the browser for a
 * WebAuthn assertion and feeds it to the `passkey` provider.
 */
export function PasskeySignInButton({ callbackUrl }: { callbackUrl: string }) {
   const [busy, setBusy] = useState(false);
   const { t } = useLanguage();

   const signInWithPasskey = async () => {
      setBusy(true);
      try {
         const res = await fetch('/api/auth/webauthn/options', { method: 'POST' });
         if (!res.ok) {
            const payload = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error ?? 'could not start passkey sign-in');
         }
         const options = (await res.json()) as Parameters<
            typeof startAuthentication
         >[0]['optionsJSON'];
         const assertion = await startAuthentication({ optionsJSON: options });
         await signIn('passkey', {
            assertion: JSON.stringify(assertion),
            redirect: true,
            redirectTo: callbackUrl,
         });
      } catch (error) {
         console.error(error);
         toast.error(t('Passkey sign-in failed'));
      } finally {
         setBusy(false);
      }
   };

   return (
      <Button
         type="button"
         variant="outline"
         className="w-full"
         disabled={busy}
         onClick={signInWithPasskey}
      >
         <Fingerprint className="size-4" />
         {busy ? t('Waiting for passkey…') : t('Sign in with a passkey')}
      </Button>
   );
}
