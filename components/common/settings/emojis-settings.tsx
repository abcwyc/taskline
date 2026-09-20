'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { fetchEmojis, putSetting, type EmojiAlias } from '@/lib/api/workspace-settings';
import { apiErrorMessage, SettingsCard, SettingsSection, SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

/** Workspace "Emojis" settings: custom emoji aliases stored as a workspace setting. */
export default function EmojisSettings() {
   const [aliases, setAliases] = useState<EmojiAlias[] | null>(null);
   const [saving, setSaving] = useState(false);
   const { t } = useLanguage();

   useEffect(() => {
      let active = true;
      fetchEmojis()
         .then((rows) => {
            if (active) setAliases(rows);
         })
         .catch((err) => {
            console.error(err);
            if (active) setAliases([]);
         });
      return () => {
         active = false;
      };
   }, []);

   const update = (index: number, patch: Partial<EmojiAlias>) => {
      setAliases(
         (rows) => rows?.map((row, i) => (i === index ? { ...row, ...patch } : row)) ?? null
      );
   };

   const remove = (index: number) => {
      setAliases((rows) => rows?.filter((_, i) => i !== index) ?? null);
   };

   const add = () => {
      setAliases((rows) => [...(rows ?? []), { name: '', emoji: '' }]);
   };

   const handleSave = async () => {
      if (!aliases) return;
      const rows: EmojiAlias[] = [];
      for (const alias of aliases) {
         const name = alias.name.trim();
         const emoji = alias.emoji.trim();
         if (!name || !emoji) {
            toast.error(t('Every alias needs a name and an emoji character.'));
            return;
         }
         rows.push({ name, emoji });
      }
      setSaving(true);
      try {
         await putSetting('emojis', rows);
         setAliases(rows);
         toast.success(t('Emojis saved'));
      } catch (err) {
         toast.error(apiErrorMessage(err, t('Failed to save emojis')));
         console.error(err);
      } finally {
         setSaving(false);
      }
   };

   return (
      <SettingsShell
         title={t('Emojis')}
         description={t('Custom emoji aliases for this workspace.')}
      >
         <SettingsSection
            title={t('Aliases')}
            description={t('A short name paired with the emoji character it stands for.')}
            action={
               <div className="flex items-center gap-2">
                  <Button size="xs" variant="secondary" onClick={add} disabled={aliases === null}>
                     <Plus className="size-3.5" />
                     {t('Add alias')}
                  </Button>
                  <Button size="xs" onClick={handleSave} disabled={saving || aliases === null}>
                     {saving ? t('Saving…') : t('Save')}
                  </Button>
               </div>
            }
         >
            <SettingsCard>
               {aliases === null && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">{t('Loading emojis…')}</p>
               )}
               {aliases?.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                     {t('No emoji aliases yet. Add one below.')}
                  </p>
               )}
               {aliases?.map((alias, index) => (
                  <div
                     key={index}
                     className="flex items-center gap-3 px-4 py-2.5 border-t border-border/60 first:border-t-0"
                  >
                     <Input
                        value={alias.emoji}
                        onChange={(e) => update(index, { emoji: e.target.value })}
                        maxLength={16}
                        placeholder="🚀"
                        aria-label={t('Emoji character')}
                        className="w-16 text-center"
                     />
                     <Input
                        value={alias.name}
                        onChange={(e) => update(index, { name: e.target.value })}
                        maxLength={40}
                        placeholder={t('Alias name, e.g. rocket')}
                        aria-label={t('Alias name')}
                        className="flex-1"
                     />
                     <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground"
                        onClick={() => remove(index)}
                        aria-label={t('Delete alias')}
                     >
                        <X className="size-4" />
                     </Button>
                  </div>
               ))}
            </SettingsCard>
            <p className="text-xs text-muted-foreground">
               {t(
                  'Aliases are stored for your workspace; emoji pickers will offer them in future surfaces.'
               )}
            </p>
         </SettingsSection>
      </SettingsShell>
   );
}
