'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { useDocumentsStore } from '@/store/documents-store';
import {
   fetchDocument,
   DocumentDetail,
   updateDocument as apiUpdateDocument,
} from '@/lib/api/documents';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * Document detail: inline-editable title + plain-text body with debounced
 * auto-save. Back link follows the document's folder (team page when the
 * folder is team-scoped, workspace settings otherwise).
 */
export default function DocumentDetails() {
   const { orgId, documentId } = useParams<{ orgId: string; documentId: string }>();
   const { t } = useLanguage();
   const folders = useDocumentsStore((s) => s.folders);
   const hydrate = useDocumentsStore((s) => s.hydrate);
   const renameDocument = useDocumentsStore((s) => s.renameDocument);
   const saveContent = useDocumentsStore((s) => s.saveContent);

   const [doc, setDoc] = useState<DocumentDetail | null>(null);
   const [loading, setLoading] = useState(true);
   const [notFound, setNotFound] = useState(false);
   const [title, setTitle] = useState('');
   const [text, setText] = useState('');
   const [saveState, setSaveState] = useState<SaveState>('idle');

   const latest = useRef({ docId: documentId, text: '' });
   latest.current = { docId: documentId, text };
   const savedText = useRef<string | null>(null);
   const dirtyRef = useRef(false);
   const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   useEffect(() => {
      void hydrate();
   }, [hydrate]);

   useEffect(() => {
      let cancelled = false;
      setLoading(true);
      fetchDocument(documentId)
         .then((d) => {
            if (cancelled) return;
            setDoc(d);
            setTitle(d.name);
            setText(d.content?.text ?? '');
            savedText.current = d.content?.text ?? '';
            setLoading(false);
         })
         .catch((err) => {
            console.error(err);
            if (!cancelled) {
               setNotFound(true);
               setLoading(false);
            }
         });
      return () => {
         cancelled = true;
      };
   }, [documentId]);

   const flushSave = useCallback(async () => {
      if (timerRef.current) {
         clearTimeout(timerRef.current);
         timerRef.current = null;
      }
      const { docId, text: current } = latest.current;
      if (!docId || current === savedText.current) return;
      setSaveState('saving');
      try {
         await apiUpdateDocument(docId, { content: { text: current } });
         savedText.current = current;
         dirtyRef.current = false;
         saveContent(docId, current);
         setSaveState('saved');
      } catch (err) {
         console.error(err);
         setSaveState('error');
      }
   }, [saveContent]);

   // flush pending edits when leaving the page; guarded by dirtyRef so the
   // StrictMode double-mount cleanup can't PATCH the not-yet-loaded content
   useEffect(
      () => () => {
         if (timerRef.current) clearTimeout(timerRef.current);
         const { docId: id, text: current } = latest.current;
         if (id && dirtyRef.current) {
            dirtyRef.current = false;
            void apiUpdateDocument(id, { content: { text: current } }).catch(() => {});
         }
      },
      []
   );

   const onTextChange = (value: string) => {
      setText(value);
      dirtyRef.current = true;
      setSaveState('dirty');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flushSave(), 900);
   };

   const commitTitle = () => {
      if (!doc) return;
      const value = title.trim();
      if (value && value !== doc.name) {
         renameDocument(doc.id, value);
         setDoc({ ...doc, name: value });
      } else {
         setTitle(doc.name);
      }
   };

   const folder = folders.find((f) => f.id === doc?.folderId);
   const backHref = folder?.teamId
      ? `/${orgId}/team/${folder.teamId}/documents`
      : `/${orgId}/settings/documents`;

   const saveLabel =
      saveState === 'saving'
         ? t('Saving…')
         : saveState === 'saved'
           ? t('Saved')
           : saveState === 'error'
             ? t('Save failed — click to retry')
             : saveState === 'dirty'
               ? t('Unsaved changes')
               : '';

   return (
      <div className="flex flex-col h-full">
         <div className="flex items-center justify-between h-10 px-4 border-b border-border/50 shrink-0">
            <Link
               href={backHref}
               className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
               <ChevronLeft className="size-4" />
               {t('Documents')}
            </Link>
            {saveState === 'error' ? (
               <Button variant="ghost" size="xs" onClick={() => void flushSave()}>
                  {saveLabel}
               </Button>
            ) : (
               saveLabel && (
                  <span className="text-xs text-muted-foreground" aria-live="polite">
                     {saveLabel}
                  </span>
               )
            )}
         </div>

         {loading && (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
               {t('Loading…')}
            </div>
         )}
         {notFound && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
               <span>{t('Document not found')}</span>
               <Button variant="secondary" size="xs" asChild>
                  <Link href={backHref}>{t('Back')}</Link>
               </Button>
            </div>
         )}

         {doc && (
            <div className="flex-1 overflow-auto">
               <div className="max-w-3xl mx-auto px-8 py-8 flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                     <span className="text-2xl leading-none mt-1.5">{doc.icon}</span>
                     <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="flex-1 bg-transparent text-2xl font-semibold outline-none border-b border-transparent focus:border-border transition-colors pb-1"
                        aria-label={t('Name')}
                     />
                  </div>
                  <div className="flex items-center gap-2 pl-11 text-xs text-muted-foreground">
                     <Avatar className="size-4">
                        <AvatarImage src={doc.creator.avatarUrl} alt={doc.creator.name} />
                        <AvatarFallback>{doc.creator.name[0]}</AvatarFallback>
                     </Avatar>
                     <span>{doc.creator.name}</span>
                     <span>·</span>
                     <span>
                        {t('Last edited')} {doc.updatedAt}
                     </span>
                  </div>
                  <textarea
                     value={text}
                     onChange={(e) => onTextChange(e.target.value)}
                     onBlur={() => void flushSave()}
                     placeholder={t('Start writing…')}
                     className="mt-4 w-full min-h-[60vh] resize-none bg-transparent text-[15px] leading-7 outline-none placeholder:text-muted-foreground/60"
                     aria-label={t('Document')}
                  />
               </div>
            </div>
         )}

         {!loading && !notFound && !doc && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
               <FileText className="size-6" />
            </div>
         )}
      </div>
   );
}
