'use client';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/components/providers/language-provider';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, GitBranch } from 'lucide-react';

interface GithubSetting {
   autoDone: boolean;
}

/**
 * Live GitHub webhook configuration (settings → integrations). Shows the
 * payload URL to paste into GitHub, whether `GITHUB_WEBHOOK_SECRET` is set on
 * the server, and the merged-PR → Done toggle.
 */
export function GithubWebhookCard({ configured }: { configured: boolean }) {
   const { t } = useLanguage();
   const [autoDone, setAutoDone] = useState<boolean | null>(null);
   const [copied, setCopied] = useState(false);

   useEffect(() => {
      fetch('/api/settings?key=github')
         .then((res) => (res.ok ? res.json() : null))
         .then((value: GithubSetting | null) => setAutoDone(Boolean(value?.autoDone)))
         .catch(() => setAutoDone(false));
   }, []);

   const webhookUrl =
      typeof window !== 'undefined'
         ? `${window.location.origin}/api/integrations/github/webhook`
         : '';

   const toggleAutoDone = async (next: boolean) => {
      const previous = autoDone;
      setAutoDone(next); // optimistic
      try {
         const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ key: 'github', value: { autoDone: next } }),
         });
         if (!res.ok) throw new Error(String(res.status));
      } catch {
         setAutoDone(previous);
         toast.error(t('Only workspace admins can change this setting.'));
      }
   };

   const copyUrl = async () => {
      try {
         await navigator.clipboard.writeText(webhookUrl);
         setCopied(true);
         setTimeout(() => setCopied(false), 1500);
      } catch {
         toast.error(t('Could not access the clipboard'));
      }
   };

   return (
      <section className="rounded-lg border bg-container p-4 flex flex-col gap-3">
         <div className="flex items-start gap-3">
            <span className="rounded-md border bg-background inline-flex items-center justify-center shrink-0 size-9">
               <GitBranch className="size-[18px]" />
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
               <span className="flex items-center gap-2">
                  <span className="text-sm font-medium">GitHub</span>
                  <span
                     className={
                        'text-[11px] border rounded px-1 py-px leading-none shrink-0 ' +
                        (configured
                           ? 'text-emerald-600 border-emerald-600/30 dark:text-emerald-400'
                           : 'text-muted-foreground')
                     }
                  >
                     {configured ? t('Webhook secret configured') : t('Webhook secret not set')}
                  </span>
               </span>
               <span className="text-xs text-muted-foreground">
                  {t(
                     'Receives pull request events and links them to issues by identifier (e.g. LNUI-701 in the PR title, body or branch name).'
                  )}
               </span>
            </div>
         </div>

         <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>{t('Payload URL (paste into GitHub → Webhooks):')}</span>
            <span className="flex items-center gap-2">
               <code className="flex-1 min-w-0 truncate rounded bg-muted/60 border px-2 py-1 text-[11px]">
                  {webhookUrl}
               </code>
               <Button
                  variant="outline"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => void copyUrl()}
               >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
               </Button>
            </span>
            {!configured && (
               <span className="text-amber-700 dark:text-amber-400">
                  {t(
                     'Set GITHUB_WEBHOOK_SECRET in the server environment, then use the same secret in the GitHub webhook configuration.'
                  )}
               </span>
            )}
         </div>

         <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="flex flex-col">
               <span className="text-sm">
                  {t('Move issues to Done when a linked PR is merged')}
               </span>
               <span className="text-xs text-muted-foreground">
                  {t('Applies on the next merged pull request event.')}
               </span>
            </span>
            <Switch
               checked={autoDone ?? false}
               disabled={autoDone === null}
               onCheckedChange={(value) => void toggleAutoDone(value)}
            />
         </label>
      </section>
   );
}
