'use client';

import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createFolder, fetchFolders } from '@/lib/api/folders';
import type { DocumentFolder } from '@/mock-data/documents';
import { useMembersStore } from '@/store/members-store';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiErrorMessage, SettingsCard, SettingsSection, SettingsShell } from './shared';
import { useLanguage } from '@/components/providers/language-provider';

/** "New folder" dialog: name + emoji, created via the folders API. */
function NewFolderDialog({
   open,
   onOpenChange,
   onCreated,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   onCreated: () => Promise<void>;
}) {
   const { t } = useLanguage();
   const [name, setName] = useState('');
   const [icon, setIcon] = useState('📁');

   useEffect(() => {
      if (open) {
         setName('');
         setIcon('📁');
      }
   }, [open]);

   const submit = async () => {
      if (!name.trim()) return;
      try {
         await createFolder({ name: name.trim(), icon: icon.trim() || '📁' });
         await onCreated();
         onOpenChange(false);
      } catch (err) {
         toast.error(apiErrorMessage(err, t('Failed to create folder')));
         console.error(err);
      }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>{t('New folder')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
               <div className="flex items-end gap-4">
                  <div className="flex flex-col gap-1.5 w-20">
                     <Label htmlFor="folder-icon">{t('Icon')}</Label>
                     <Input
                        id="folder-icon"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        maxLength={4}
                        className="text-center"
                     />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                     <Label htmlFor="folder-name">{t('Name')}</Label>
                     <Input
                        id="folder-name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder={t('Roadmap docs')}
                     />
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  {t('Cancel')}
               </Button>
               <Button onClick={submit} disabled={!name.trim()}>
                  {t('Create')}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

/**
 * Workspace "Documents" settings: read-only overview of every document
 * grouped by folder. Documents are managed on each team's documents page.
 */
export default function DocumentsSettings() {
   const { t } = useLanguage();
   const members = useMembersStore((s) => s.members);
   const [folders, setFolders] = useState<DocumentFolder[] | null>(null);
   const [dialogOpen, setDialogOpen] = useState(false);

   const load = useCallback(async () => {
      try {
         setFolders(await fetchFolders());
      } catch (err) {
         console.error(err);
         toast.error(apiErrorMessage(err, t('Failed to load documents')));
         setFolders([]);
      }
   }, [t]);

   useEffect(() => {
      void load();
   }, [load]);

   const documentCount = folders?.reduce((sum, folder) => sum + folder.documents.length, 0) ?? 0;

   return (
      <SettingsShell
         title={t('Documents')}
         description={t(
            "Every document in the workspace, grouped by folder. Documents are created and edited on each team's documents page."
         )}
      >
         <SettingsSection
            title={
               folders
                  ? t('{documents} documents in {folders} folders')
                       .replace('{documents}', String(documentCount))
                       .replace('{folders}', String(folders.length))
                  : undefined
            }
            action={
               <Button size="xs" onClick={() => setDialogOpen(true)}>
                  <Plus className="size-4 md:mr-1" />
                  {t('New folder')}
               </Button>
            }
         >
            {folders === null && (
               <div className="px-4 py-3 text-sm text-muted-foreground">
                  {t('Loading documents…')}
               </div>
            )}
            {folders?.map((folder) => (
               <SettingsCard key={folder.id}>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-accent/30">
                     <span className="text-base shrink-0">{folder.icon}</span>
                     <span className="text-sm font-medium truncate">{folder.name}</span>
                     <span className="ml-auto text-xs text-muted-foreground shrink-0">
                        {folder.documents.length}{' '}
                        {folder.documents.length === 1 ? t('document') : t('documents')}
                     </span>
                  </div>
                  {folder.documents.map((doc) => {
                     const creator = members.find((m) => m.id === doc.creator.id) ?? doc.creator;
                     return (
                        <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5">
                           <span className="text-base shrink-0">{doc.icon}</span>
                           <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{doc.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                 {t('Created by')} {creator.name}
                              </div>
                           </div>
                           <div className="shrink-0 text-xs text-muted-foreground">
                              {t('Updated')} {doc.updatedAt.slice(0, 10)}
                           </div>
                        </div>
                     );
                  })}
                  {folder.documents.length === 0 && (
                     <div className="px-4 py-3 text-xs text-muted-foreground">
                        {t('No documents')}
                     </div>
                  )}
               </SettingsCard>
            ))}
            {folders?.length === 0 && (
               <div className="px-4 py-3 text-sm text-muted-foreground">
                  {t('No folders yet — create one to organize documents.')}
               </div>
            )}
         </SettingsSection>

         <NewFolderDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={() => load()} />
      </SettingsShell>
   );
}
