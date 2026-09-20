'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/providers/language-provider';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';

interface ResetPasswordDialogProps {
   /** The member to reset; null when the dialog is closed. */
   member: { id: string; name: string; email: string } | null;
   onClose: () => void;
}

/** Admin action: generate a single-use password reset link (valid 30 minutes). */
export function ResetPasswordDialog({ member, onClose }: ResetPasswordDialogProps) {
   const { t } = useLanguage();
   const [busy, setBusy] = useState(false);
   const [url, setUrl] = useState<string | null>(null);
   const [copied, setCopied] = useState(false);

   useEffect(() => {
      if (member) {
         setUrl(null);
         setCopied(false);
      }
   }, [member]);

   const generate = async () => {
      if (!member) return;
      setBusy(true);
      try {
         const res = await fetch(`/api/members/${member.id}/password-reset`, { method: 'POST' });
         if (!res.ok) {
            const payload = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error ?? t('Could not generate reset link'));
         }
         const data = (await res.json()) as { url: string };
         setUrl(data.url);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : t('Could not generate reset link'));
      } finally {
         setBusy(false);
      }
   };

   const copy = async () => {
      if (!url) return;
      try {
         await navigator.clipboard.writeText(url);
         setCopied(true);
         setTimeout(() => setCopied(false), 1500);
      } catch {
         toast.error(t('Could not copy — select and copy manually'));
      }
   };

   return (
      <Dialog open={!!member} onOpenChange={(v) => !v && onClose()}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>{t('Reset password')}</DialogTitle>
               <DialogDescription>
                  {t(
                     'Generate a single-use reset link (valid 30 minutes). Share it with the member securely.'
                  )}
               </DialogDescription>
            </DialogHeader>

            {url ? (
               <>
                  <div className="flex items-center gap-2 py-2">
                     <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs">
                        {url}
                     </code>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground"
                        aria-label={t('Copy reset link')}
                        onClick={copy}
                     >
                        {copied ? (
                           <Check className="size-3.5 text-green-600" />
                        ) : (
                           <Copy className="size-3.5" />
                        )}
                     </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                     {t(
                        'This link is shown once, stops working after use and expires in 30 minutes.'
                     )}
                  </p>
                  <DialogFooter>
                     <Button onClick={onClose}>{t('Close')}</Button>
                  </DialogFooter>
               </>
            ) : (
               <>
                  <p className="py-2 text-sm text-muted-foreground">
                     {`${t('The link lets')} ${member?.email ?? t('the member')} ${t(
                        'set a new password. Nothing is emailed — pass it along through a channel you trust.'
                     )}`}
                  </p>
                  <DialogFooter>
                     <Button variant="ghost" onClick={onClose}>
                        {t('Cancel')}
                     </Button>
                     <Button onClick={generate} disabled={busy}>
                        {busy ? t('Generating…') : t('Generate')}
                     </Button>
                  </DialogFooter>
               </>
            )}
         </DialogContent>
      </Dialog>
   );
}
