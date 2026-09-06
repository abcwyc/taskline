'use client';

import { useEffect, useRef } from 'react';

import { useCurrentUserId } from '@/lib/hooks/use-current-user';
import { useAttachmentsStore } from '@/store/attachments-store';
import { Download, Loader2, Paperclip, X } from 'lucide-react';

function humanSize(bytes: number): string {
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
   return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Issue attachments: upload button + list with download / delete. */
export function AttachmentsSection({ issueIdentifier }: { issueIdentifier: string }) {
   const inputRef = useRef<HTMLInputElement>(null);
   const meId = useCurrentUserId();
   const files = useAttachmentsStore((s) => s.byIssue[issueIdentifier]);
   const uploading = useAttachmentsStore((s) => s.uploading[issueIdentifier]);
   const ensure = useAttachmentsStore((s) => s.ensure);
   const upload = useAttachmentsStore((s) => s.upload);
   const remove = useAttachmentsStore((s) => s.remove);

   useEffect(() => {
      ensure(issueIdentifier);
   }, [ensure, issueIdentifier]);

   const onPick = async (fileList: FileList | null) => {
      if (!fileList) return;
      for (const file of Array.from(fileList)) await upload(issueIdentifier, file);
      if (inputRef.current) inputRef.current.value = '';
   };

   const list = files ?? [];

   return (
      <div className="mt-6">
         <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
               Attachments
               {list.length > 0 && <span className="text-muted-foreground"> {list.length}</span>}
            </h2>
            <button
               type="button"
               onClick={() => inputRef.current?.click()}
               disabled={uploading}
               className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
               {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
               ) : (
                  <Paperclip className="size-3.5" />
               )}
               {uploading ? 'Uploading…' : 'Add file'}
            </button>
            <input
               ref={inputRef}
               type="file"
               multiple
               className="hidden"
               onChange={(e) => onPick(e.target.files)}
            />
         </div>

         {list.length > 0 && (
            <ul className="mt-2 flex flex-col divide-y divide-border/50 border-t border-border/50">
               {list.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 py-2 text-sm">
                     <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                     <span className="min-w-0 flex-1 truncate">{file.filename}</span>
                     <span className="shrink-0 text-xs text-muted-foreground">
                        {humanSize(file.size)}
                     </span>
                     <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Download ${file.filename}`}
                     >
                        <Download className="size-4" />
                     </a>
                     {(file.uploadedById === meId || !file.uploadedById) && (
                        <button
                           type="button"
                           onClick={() => remove(issueIdentifier, file.id)}
                           className="shrink-0 text-muted-foreground hover:text-destructive"
                           aria-label={`Delete ${file.filename}`}
                        >
                           <X className="size-4" />
                        </button>
                     )}
                  </li>
               ))}
            </ul>
         )}
      </div>
   );
}
