import { create } from 'zustand';
import { toast } from 'sonner';

import {
   deleteAttachment as apiDelete,
   fetchAttachments,
   uploadAttachment,
} from '@/lib/api/attachments';
import type { AttachmentDTO } from '@/lib/api/types';

/** Per-issue attachment lists, keyed by issue identifier. Lazy-loaded. */
interface AttachmentsState {
   byIssue: Record<string, AttachmentDTO[]>;
   loading: Record<string, boolean>;
   uploading: Record<string, boolean>;

   ensure: (identifier: string) => void;
   upload: (identifier: string, file: File) => Promise<void>;
   remove: (identifier: string, id: string) => Promise<void>;
}

export const useAttachmentsStore = create<AttachmentsState>((set, get) => ({
   byIssue: {},
   loading: {},
   uploading: {},

   ensure: (identifier) => {
      if (get().byIssue[identifier] || get().loading[identifier]) return;
      set((s) => ({ loading: { ...s.loading, [identifier]: true } }));
      fetchAttachments(identifier)
         .then((rows) =>
            set((s) => ({
               byIssue: { ...s.byIssue, [identifier]: rows },
               loading: { ...s.loading, [identifier]: false },
            }))
         )
         .catch(() => set((s) => ({ loading: { ...s.loading, [identifier]: false } })));
   },

   upload: async (identifier, file) => {
      set((s) => ({ uploading: { ...s.uploading, [identifier]: true } }));
      try {
         const saved = await uploadAttachment(identifier, file);
         set((s) => ({
            byIssue: {
               ...s.byIssue,
               [identifier]: [...(s.byIssue[identifier] ?? []), saved],
            },
         }));
      } catch (err) {
         toast.error((err as Error).message || 'Upload failed');
      } finally {
         set((s) => ({ uploading: { ...s.uploading, [identifier]: false } }));
      }
   },

   remove: async (identifier, id) => {
      const snapshot = get().byIssue[identifier] ?? [];
      set((s) => ({
         byIssue: { ...s.byIssue, [identifier]: snapshot.filter((a) => a.id !== id) },
      }));
      try {
         await apiDelete(id);
      } catch {
         set((s) => ({ byIssue: { ...s.byIssue, [identifier]: snapshot } }));
         toast.error('Failed to delete attachment');
      }
   },
}));
