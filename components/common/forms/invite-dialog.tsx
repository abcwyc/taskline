'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { createInvite, fetchInvites, revokeInvite } from '@/lib/api/invites';
import type { InviteDTO } from '@/lib/api/types';
import { Check, Copy, Trash2 } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

export function InviteDialog({
   open,
   onOpenChange,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
}) {
   const [email, setEmail] = useState('');
   const [role, setRole] = useState('Member');
   const [busy, setBusy] = useState(false);
   const [invites, setInvites] = useState<InviteDTO[]>([]);
   const [copied, setCopied] = useState<string | null>(null);
   const { t } = useLanguage();

   const load = useCallback(() => {
      fetchInvites()
         .then(setInvites)
         .catch(() => setInvites([]));
   }, []);

   useEffect(() => {
      if (open) {
         setEmail('');
         setRole('Member');
         load();
      }
   }, [open, load]);

   const copy = async (invite: InviteDTO) => {
      try {
         await navigator.clipboard.writeText(invite.url);
         setCopied(invite.id);
         setTimeout(() => setCopied(null), 1500);
      } catch {
         toast.error(t('Could not copy — select and copy manually'));
      }
   };

   const create = async () => {
      setBusy(true);
      try {
         const invite = await createInvite({ email: email.trim() || null, role });
         setInvites((prev) => [invite, ...prev]);
         setEmail('');
         await copy(invite);
         toast.success(t('Invite link created and copied'));
      } catch (err) {
         toast.error((err as Error).message.replace(/^POST .*→ \d+ /, '') || t('Failed to invite'));
      } finally {
         setBusy(false);
      }
   };

   const revoke = async (id: string) => {
      setInvites((prev) => prev.filter((i) => i.id !== id));
      try {
         await revokeInvite(id);
      } catch {
         toast.error(t('Failed to revoke'));
         load();
      }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>{t('Invite members')}</DialogTitle>
            </DialogHeader>

            <div className="flex items-end gap-2 py-1">
               <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="invite-email">{t('Email (optional)')}</Label>
                  <Input
                     id="invite-email"
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && !busy && create()}
                     placeholder="teammate@example.com"
                  />
               </div>
               <div className="flex w-28 flex-col gap-1.5">
                  <Label>{t('Role')}</Label>
                  <Select value={role} onValueChange={setRole}>
                     <SelectTrigger>
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="Member">{t('Member')}</SelectItem>
                        <SelectItem value="Guest">{t('Guest')}</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <Button onClick={create} disabled={busy}>
                  {t('Create link')}
               </Button>
            </div>
            <p className="text-xs text-muted-foreground">
               {t('Leave the email blank for a link anyone can use once. Links expire in 14 days.')}
            </p>

            {invites.length > 0 && (
               <div className="mt-2 flex flex-col gap-1 border-t pt-3">
                  <span className="text-xs font-medium text-muted-foreground">
                     {t('Pending invites')}
                  </span>
                  {invites.map((invite) => (
                     <div
                        key={invite.id}
                        className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent/40"
                     >
                        <span className="min-w-0 flex-1 truncate">
                           {invite.email ?? t('Open link')}
                           <span className="ml-1.5 text-xs text-muted-foreground">
                              {t(invite.role)}
                           </span>
                        </span>
                        <Button
                           variant="ghost"
                           size="icon"
                           className="size-7 text-muted-foreground"
                           onClick={() => copy(invite)}
                           aria-label={t('Copy invite link')}
                        >
                           {copied === invite.id ? (
                              <Check className="size-3.5 text-green-600" />
                           ) : (
                              <Copy className="size-3.5" />
                           )}
                        </Button>
                        <Button
                           variant="ghost"
                           size="icon"
                           className="size-7 text-muted-foreground hover:text-destructive"
                           onClick={() => revoke(invite.id)}
                           aria-label={t('Revoke invite')}
                        >
                           <Trash2 className="size-3.5" />
                        </Button>
                     </div>
                  ))}
               </div>
            )}
         </DialogContent>
      </Dialog>
   );
}
