'use client';

import { startRegistration } from '@simplewebauthn/browser';
import { format, parseISO } from 'date-fns';
import { Check, Copy, Fingerprint, KeyRound, LogOut, Trash2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

interface PasskeyRow {
   id: string;
   label: string;
   createdAt: string;
   lastUsedAt: string | null;
   backedUp: boolean;
}

interface ApiKeyRow {
   id: string;
   name: string;
   prefix: string;
   createdAt: string;
   lastUsedAt: string | null;
   revokedAt: string | null;
}

/** Read the { error } body of a failed response, or fall back to a generic message. */
async function responseError(response: Response, fallback: string): Promise<string> {
   const payload = (await response.json().catch(() => ({}))) as { error?: string };
   return payload.error ?? fallback;
}

const fmtDate = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');

/** Copy-to-clipboard button with transient check feedback. */
function CopyButton({ value, label }: { value: string; label: string }) {
   const [copied, setCopied] = useState(false);
   const { t } = useLanguage();
   return (
      <Button
         variant="ghost"
         size="icon"
         className="size-7 shrink-0 text-muted-foreground"
         aria-label={label}
         onClick={async () => {
            try {
               await navigator.clipboard.writeText(value);
               setCopied(true);
               setTimeout(() => setCopied(false), 1500);
            } catch {
               toast.error(t('Could not copy — select and copy manually'));
            }
         }}
      >
         {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
      </Button>
   );
}

/** Two-factor authentication (TOTP): enable via setup + verify, disable with password. */
function TotpSection() {
   const [enabled, setEnabled] = useState(false);
   const [setupBusy, setSetupBusy] = useState(false);
   const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
   const [code, setCode] = useState('');
   const [verifyBusy, setVerifyBusy] = useState(false);
   const [disableOpen, setDisableOpen] = useState(false);
   const [password, setPassword] = useState('');
   const [disableBusy, setDisableBusy] = useState(false);
   const { t } = useLanguage();

   const startSetup = async () => {
      setSetupBusy(true);
      try {
         const res = await fetch('/api/me/mfa/totp/setup', { method: 'POST' });
         if (res.status === 409) {
            // Setup refuses when two-factor is already on — that's our signal.
            setEnabled(true);
            toast(t('Two-factor is already enabled'));
            return;
         }
         if (!res.ok)
            throw new Error(await responseError(res, t('Could not start two-factor setup')));
         setSetup(await res.json());
         setCode('');
      } catch (error) {
         toast.error(
            error instanceof Error ? error.message : t('Could not start two-factor setup')
         );
      } finally {
         setSetupBusy(false);
      }
   };

   const verify = async () => {
      if (!setup || !/^\d{6}$/.test(code)) return;
      setVerifyBusy(true);
      try {
         const res = await fetch('/api/me/mfa/totp/enable', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code }),
         });
         if (!res.ok) throw new Error(await responseError(res, t('Could not enable two-factor')));
         setEnabled(true);
         setSetup(null);
         setCode('');
         toast.success(t('Two-factor authentication enabled'));
      } catch (error) {
         toast.error(error instanceof Error ? error.message : t('Could not enable two-factor'));
      } finally {
         setVerifyBusy(false);
      }
   };

   const disable = async () => {
      if (!password) return;
      setDisableBusy(true);
      try {
         const res = await fetch('/api/me/mfa/totp/disable', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ password }),
         });
         if (!res.ok) throw new Error(await responseError(res, t('Could not disable two-factor')));
         setEnabled(false);
         setDisableOpen(false);
         setPassword('');
         toast.success(t('Two-factor authentication disabled'));
      } catch (error) {
         toast.error(error instanceof Error ? error.message : t('Could not disable two-factor'));
      } finally {
         setDisableBusy(false);
      }
   };

   return (
      <SettingsSection
         title={t('Two-factor authentication')}
         description={t('Require a code from your authenticator app in addition to your password.')}
      >
         <div className="flex items-center gap-2">
            {enabled && (
               <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {t('Enabled')}
               </Badge>
            )}
            <Button size="sm" onClick={startSetup} disabled={setupBusy}>
               {setupBusy ? t('Starting…') : t('Enable two-factor')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDisableOpen(true)}>
               {t('Disable')}
            </Button>
         </div>
         <p className="text-xs text-muted-foreground">
            {t('If enabled, a 6-digit code is required at sign-in.')}
         </p>

         <Dialog open={!!setup} onOpenChange={(v) => !v && setSetup(null)}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>{t('Enable two-factor authentication')}</DialogTitle>
                  <DialogDescription>
                     {t(
                        'Add the secret to your authenticator app, then enter the current 6-digit code.'
                     )}
                  </DialogDescription>
               </DialogHeader>
               <div className="flex flex-col gap-4 py-2">
                  <div className="flex flex-col gap-1.5">
                     <Label>{t('Secret')}</Label>
                     <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
                           {setup?.secret}
                        </code>
                        <CopyButton value={setup?.secret ?? ''} label={t('Copy secret')} />
                     </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="totp-verify-code">{t('Current code')}</Label>
                     <Input
                        id="totp-verify-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="123456"
                     />
                  </div>
               </div>
               <DialogFooter>
                  <Button variant="ghost" onClick={() => setSetup(null)}>
                     {t('Cancel')}
                  </Button>
                  <Button onClick={verify} disabled={verifyBusy || !/^\d{6}$/.test(code)}>
                     {verifyBusy ? t('Verifying…') : t('Verify')}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog
            open={disableOpen}
            onOpenChange={(v) => {
               setDisableOpen(v);
               if (!v) setPassword('');
            }}
         >
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>{t('Disable two-factor authentication')}</DialogTitle>
                  <DialogDescription>
                     {t('Enter your account password to turn off two-factor.')}
                  </DialogDescription>
               </DialogHeader>
               <div className="flex flex-col gap-1.5 py-2">
                  <Label htmlFor="totp-password">{t('Password')}</Label>
                  <Input
                     id="totp-password"
                     type="password"
                     autoComplete="current-password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                  />
               </div>
               <DialogFooter>
                  <Button variant="ghost" onClick={() => setDisableOpen(false)}>
                     {t('Cancel')}
                  </Button>
                  <Button onClick={disable} disabled={disableBusy || !password}>
                     {disableBusy ? t('Disabling…') : t('Disable two-factor')}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </SettingsSection>
   );
}

/** Passkeys: register new credentials, list them, remove them. */
function PasskeysSection() {
   const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
   const [loaded, setLoaded] = useState(false);
   const [addOpen, setAddOpen] = useState(false);
   const [label, setLabel] = useState('');
   const [addBusy, setAddBusy] = useState(false);
   const [deleting, setDeleting] = useState<PasskeyRow | null>(null);
   const [deleteBusy, setDeleteBusy] = useState(false);
   const { t } = useLanguage();

   const load = useCallback(() => {
      fetch('/api/me/passkeys')
         .then(async (res) => {
            if (!res.ok) throw new Error(await responseError(res, t('Could not load passkeys')));
            return (await res.json()) as PasskeyRow[];
         })
         .then(setPasskeys)
         .catch((error) => {
            toast.error(error instanceof Error ? error.message : t('Could not load passkeys'));
         })
         .finally(() => setLoaded(true));
   }, [t]);

   useEffect(() => {
      load();
   }, [load]);

   const add = async () => {
      setAddBusy(true);
      try {
         const res = await fetch('/api/me/passkeys/options', { method: 'POST' });
         if (!res.ok) throw new Error(await responseError(res, t('Could not start passkey setup')));
         const options = (await res.json()) as Parameters<
            typeof startRegistration
         >[0]['optionsJSON'];
         const attestation = await startRegistration({ optionsJSON: options });
         const save = await fetch('/api/me/passkeys', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
               label: label.trim() || t('Passkey'),
               attestation: JSON.stringify(attestation),
            }),
         });
         if (!save.ok) throw new Error(await responseError(save, t('Could not save passkey')));
         toast.success(t('Passkey added'));
         setAddOpen(false);
         setLabel('');
         load();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : t('Could not add passkey'));
      } finally {
         setAddBusy(false);
      }
   };

   const remove = async () => {
      if (!deleting) return;
      setDeleteBusy(true);
      try {
         const res = await fetch(`/api/me/passkeys/${deleting.id}`, { method: 'DELETE' });
         if (!res.ok) throw new Error(await responseError(res, t('Could not delete passkey')));
         toast.success(t('Passkey removed'));
         setDeleting(null);
         load();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : t('Could not delete passkey'));
      } finally {
         setDeleteBusy(false);
      }
   };

   return (
      <SettingsSection
         title={`${passkeys.length} ${t('passkeys')}`}
         description={t('Sign in with a fingerprint, face or hardware security key.')}
         action={
            <Button
               size="xs"
               onClick={() => {
                  setLabel('');
                  setAddOpen(true);
               }}
            >
               {t('Add passkey')}
            </Button>
         }
      >
         <SettingsCard>
            {passkeys.map((passkey) => (
               <SettingsRow
                  key={passkey.id}
                  icon={<Fingerprint className="size-4" />}
                  title={passkey.label}
                  description={`${t('Added')} ${fmtDate(passkey.createdAt)} · ${t('Last used')} ${
                     passkey.lastUsedAt ? fmtDate(passkey.lastUsedAt) : t('Never')
                  }`}
                  trailing={
                     <>
                        {passkey.backedUp && (
                           <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              {t('Synced')}
                           </Badge>
                        )}
                        <Button
                           variant="ghost"
                           size="icon"
                           className="size-7 text-muted-foreground hover:text-destructive"
                           aria-label={t('Remove {name}').replace('{name}', passkey.label)}
                           onClick={() => setDeleting(passkey)}
                        >
                           <Trash2 className="size-3.5" />
                        </Button>
                     </>
                  }
               />
            ))}
            {loaded && passkeys.length === 0 && (
               <div className="px-4 py-3 text-sm text-muted-foreground">
                  {t('No passkeys yet — add one to sign in without a password.')}
               </div>
            )}
         </SettingsCard>

         <Dialog
            open={addOpen}
            onOpenChange={(v) => {
               setAddOpen(v);
               if (!v) setLabel('');
            }}
         >
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>{t('Add passkey')}</DialogTitle>
                  <DialogDescription>
                     {t(
                        'Name this passkey so you can recognize it later, then confirm with your device.'
                     )}
                  </DialogDescription>
               </DialogHeader>
               <div className="flex flex-col gap-1.5 py-2">
                  <Label htmlFor="passkey-label">{t('Label')}</Label>
                  <Input
                     id="passkey-label"
                     autoFocus
                     maxLength={60}
                     value={label}
                     onChange={(e) => setLabel(e.target.value)}
                     placeholder="MacBook Touch ID"
                  />
               </div>
               <DialogFooter>
                  <Button variant="ghost" onClick={() => setAddOpen(false)}>
                     {t('Cancel')}
                  </Button>
                  <Button onClick={add} disabled={addBusy}>
                     {addBusy ? t('Waiting for device…') : t('Continue')}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>{t('Remove passkey')}</AlertDialogTitle>
                  <AlertDialogDescription>
                     {t('Remove "{name}"? You will no longer be able to sign in with it.').replace(
                        '{name}',
                        deleting?.label ?? ''
                     )}
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                     className="bg-destructive text-white hover:bg-destructive/90"
                     onClick={remove}
                     disabled={deleteBusy}
                  >
                     {t('Remove')}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </SettingsSection>
   );
}

/** Personal API keys: create (full key shown once), list, revoke. */
function ApiKeysSection() {
   const [keys, setKeys] = useState<ApiKeyRow[]>([]);
   const [loaded, setLoaded] = useState(false);
   const [createOpen, setCreateOpen] = useState(false);
   const [name, setName] = useState('');
   const [createBusy, setCreateBusy] = useState(false);
   const [newKey, setNewKey] = useState<string | null>(null);
   const [revoking, setRevoking] = useState<ApiKeyRow | null>(null);
   const [revokeBusy, setRevokeBusy] = useState(false);
   const { t } = useLanguage();

   const load = useCallback(() => {
      fetch('/api/me/api-keys')
         .then(async (res) => {
            if (!res.ok) throw new Error(await responseError(res, t('Could not load API keys')));
            return (await res.json()) as ApiKeyRow[];
         })
         .then(setKeys)
         .catch((error) => {
            toast.error(error instanceof Error ? error.message : t('Could not load API keys'));
         })
         .finally(() => setLoaded(true));
   }, [t]);

   useEffect(() => {
      load();
   }, [load]);

   const create = async () => {
      if (!name.trim()) return;
      setCreateBusy(true);
      try {
         const res = await fetch('/api/me/api-keys', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),
         });
         if (!res.ok) throw new Error(await responseError(res, t('Could not create API key')));
         const created = (await res.json()) as ApiKeyRow & { key: string };
         setNewKey(created.key);
         setName('');
         load();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : t('Could not create API key'));
      } finally {
         setCreateBusy(false);
      }
   };

   const revoke = async () => {
      if (!revoking) return;
      setRevokeBusy(true);
      try {
         const res = await fetch(`/api/me/api-keys/${revoking.id}`, { method: 'DELETE' });
         if (!res.ok) throw new Error(await responseError(res, t('Could not revoke API key')));
         toast.success(t('API key revoked'));
         setRevoking(null);
         load();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : t('Could not revoke API key'));
      } finally {
         setRevokeBusy(false);
      }
   };

   return (
      <SettingsSection
         title={`${keys.length} ${t('API keys')}`}
         description={
            <>
               {t('Use with')}{' '}
               <code className="font-mono text-xs">Authorization: Bearer {'<key>'}</code>{' '}
               {t('against the REST API; keys act with your role.')}
            </>
         }
         action={
            <Button
               size="xs"
               onClick={() => {
                  setName('');
                  setNewKey(null);
                  setCreateOpen(true);
               }}
            >
               {t('Create key')}
            </Button>
         }
      >
         <SettingsCard>
            {keys.map((key) => (
               <SettingsRow
                  key={key.id}
                  muted={!!key.revokedAt}
                  icon={<KeyRound className="size-4" />}
                  title={
                     <>
                        {key.name}
                        {key.revokedAt && (
                           <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              {t('Revoked')}
                           </Badge>
                        )}
                     </>
                  }
                  description={`${key.prefix}… · ${t('Created')} ${fmtDate(key.createdAt)} · ${t(
                     'Last used'
                  )} ${key.lastUsedAt ? fmtDate(key.lastUsedAt) : t('Never')}`}
                  trailing={
                     !key.revokedAt && (
                        <Button
                           variant="ghost"
                           size="icon"
                           className="size-7 text-muted-foreground hover:text-destructive"
                           aria-label={t('Revoke {name}').replace('{name}', key.name)}
                           onClick={() => setRevoking(key)}
                        >
                           <Trash2 className="size-3.5" />
                        </Button>
                     )
                  }
               />
            ))}
            {loaded && keys.length === 0 && (
               <div className="px-4 py-3 text-sm text-muted-foreground">
                  {t('No API keys yet — create one to call the REST API.')}
               </div>
            )}
         </SettingsCard>

         <Dialog
            open={createOpen}
            onOpenChange={(v) => {
               setCreateOpen(v);
               if (!v) {
                  setName('');
                  setNewKey(null);
               }
            }}
         >
            <DialogContent className="sm:max-w-md">
               {newKey ? (
                  <>
                     <DialogHeader>
                        <DialogTitle>{t('API key created')}</DialogTitle>
                        <DialogDescription>
                           {t("Copy it now — you won't see this again.")}
                        </DialogDescription>
                     </DialogHeader>
                     <div className="flex items-center gap-2 py-2">
                        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs">
                           {newKey}
                        </code>
                        <CopyButton value={newKey} label={t('Copy API key')} />
                     </div>
                     <p className="text-xs text-muted-foreground">
                        {t(
                           'Treat this key like a password — requests made with it act with your role.'
                        )}
                     </p>
                     <DialogFooter>
                        <Button
                           onClick={() => {
                              setCreateOpen(false);
                              setNewKey(null);
                           }}
                        >
                           {t('Acknowledge')}
                        </Button>
                     </DialogFooter>
                  </>
               ) : (
                  <>
                     <DialogHeader>
                        <DialogTitle>{t('Create API key')}</DialogTitle>
                        <DialogDescription>
                           {t('The full key is shown exactly once, right after it is created.')}
                        </DialogDescription>
                     </DialogHeader>
                     <div className="flex flex-col gap-1.5 py-2">
                        <Label htmlFor="api-key-name">{t('Name')}</Label>
                        <Input
                           id="api-key-name"
                           autoFocus
                           maxLength={80}
                           value={name}
                           onChange={(e) => setName(e.target.value)}
                           placeholder={t('CI pipeline')}
                        />
                     </div>
                     <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                           {t('Cancel')}
                        </Button>
                        <Button onClick={create} disabled={createBusy || !name.trim()}>
                           {createBusy ? t('Creating…') : t('Create key')}
                        </Button>
                     </DialogFooter>
                  </>
               )}
            </DialogContent>
         </Dialog>

         <AlertDialog open={!!revoking} onOpenChange={(v) => !v && setRevoking(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>{t('Revoke API key')}</AlertDialogTitle>
                  <AlertDialogDescription>
                     {t(
                        'Revoke "{name}"? Requests using it will stop working immediately.'
                     ).replace('{name}', revoking?.name ?? '')}
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                     className="bg-destructive text-white hover:bg-destructive/90"
                     onClick={revoke}
                     disabled={revokeBusy}
                  >
                     {t('Revoke')}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </SettingsSection>
   );
}

/** Sessions: one destructive control that invalidates every JWT session. */
function SessionsSection() {
   const [open, setOpen] = useState(false);
   const [busy, setBusy] = useState(false);
   const { t } = useLanguage();

   const revokeAll = async () => {
      setBusy(true);
      try {
         const res = await fetch('/api/me/sessions/revoke-all', { method: 'POST' });
         if (!res.ok)
            throw new Error(await responseError(res, t('Could not sign out all sessions')));
         setOpen(false);
         await signOut({ callbackUrl: '/sign-in' });
      } catch (error) {
         toast.error(error instanceof Error ? error.message : t('Could not sign out all sessions'));
         setBusy(false);
      }
   };

   return (
      <SettingsSection
         title={t('Sessions')}
         description={t('Stay signed in everywhere until you sign out of all devices at once.')}
      >
         <SettingsCard>
            <SettingsRow
               icon={<LogOut className="size-4" />}
               title={t('All devices')}
               description={t('Signs out of every session, including this one.')}
               trailing={
                  <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
                     {t('Sign out all sessions')}
                  </Button>
               }
            />
         </SettingsCard>

         <AlertDialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>{t('Sign out all sessions')}</AlertDialogTitle>
                  <AlertDialogDescription>
                     {t(
                        'You will be signed out immediately and need to sign in again to continue.'
                     )}
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                     className="bg-destructive text-white hover:bg-destructive/90"
                     onClick={(e) => {
                        e.preventDefault();
                        revokeAll();
                     }}
                     disabled={busy}
                  >
                     {busy ? t('Signing out…') : t('Sign out everywhere')}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </SettingsSection>
   );
}

export default function AccountSecurity() {
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [busy, setBusy] = useState(false);
   const { t } = useLanguage();

   async function submit(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (newPassword !== confirmPassword) {
         toast.error(t('New passwords do not match'));
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
            throw new Error(payload.error ?? t('Could not change password'));
         }
         toast.success(t('Password changed. Sign in again on this device.'));
         window.location.assign('/sign-in?error=PasswordChanged');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : t('Could not change password'));
      } finally {
         setBusy(false);
      }
   }

   return (
      <SettingsShell
         title={t('Security & access')}
         description={t(
            'Manage your password, two-factor authentication, passkeys, API keys and sessions.'
         )}
      >
         <SettingsSection
            title={t('Password')}
            description={t('Changing your password signs out all sessions.')}
         >
            <form
               onSubmit={submit}
               className="max-w-md space-y-4 rounded-lg border bg-container p-4"
            >
               <div className="space-y-1.5">
                  <Label htmlFor="current-password">{t('Current password')}</Label>
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
                  <Label htmlFor="new-password">{t('New password')}</Label>
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
                  <Label htmlFor="confirm-password">{t('Confirm new password')}</Label>
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
                  {busy ? t('Changing…') : t('Change password')}
               </Button>
            </form>
         </SettingsSection>

         <TotpSection />
         <PasskeysSection />
         <ApiKeysSection />
         <SessionsSection />
      </SettingsShell>
   );
}
