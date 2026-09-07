'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState } from 'react';
import { SettingsSection, SettingsShell } from './shared';

export default function AccountSecurity() {
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [busy, setBusy] = useState(false);

   async function submit(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (newPassword !== confirmPassword) {
         toast.error('New passwords do not match');
         return;
      }
      setBusy(true);
      try {
         const response = await fetch('/api/me/password', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
         });
         if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error ?? 'Could not change password');
         }
         toast.success('Password changed. Sign in again on this device.');
         window.location.assign('/sign-in?error=PasswordChanged');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Could not change password');
      } finally {
         setBusy(false);
      }
   }

   return (
      <SettingsShell title="Security & access" description="Manage the password for your account.">
         <SettingsSection
            title="Password"
            description="Changing your password signs out all sessions."
         >
            <form
               onSubmit={submit}
               className="max-w-md space-y-4 rounded-lg border bg-container p-4"
            >
               <div className="space-y-1.5">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                     id="current-password"
                     type="password"
                     autoComplete="current-password"
                     value={currentPassword}
                     onChange={(event) => setCurrentPassword(event.target.value)}
                     required
                  />
               </div>
               <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                     id="new-password"
                     type="password"
                     autoComplete="new-password"
                     minLength={8}
                     value={newPassword}
                     onChange={(event) => setNewPassword(event.target.value)}
                     required
                  />
               </div>
               <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                     id="confirm-password"
                     type="password"
                     autoComplete="new-password"
                     minLength={8}
                     value={confirmPassword}
                     onChange={(event) => setConfirmPassword(event.target.value)}
                     required
                  />
               </div>
               <Button type="submit" disabled={busy}>
                  {busy ? 'Changing…' : 'Change password'}
               </Button>
            </form>
         </SettingsSection>
      </SettingsShell>
   );
}
