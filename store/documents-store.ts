import { DocumentFolder, documentFolders as mockFolders } from '@/mock-data/documents';
import { create } from 'zustand';
import { toast } from 'sonner';

import {
   createDocument as apiCreate,
   deleteDocument as apiDelete,
   fetchDocumentFolders as apiFetch,
   updateDocument as apiUpdate,
} from '@/lib/api/documents';
import type { DocumentCreateBody } from '@/lib/api/types';

interface DocumentsState {
   folders: DocumentFolder[];
   hydrated: boolean;
   hydrate: () => Promise<void>;

   getFolders: () => DocumentFolder[];
   allDocuments: () => DocumentFolder['documents'];

   createDocument: (input: DocumentCreateBody) => Promise<void>;
   renameDocument: (id: string, name: string) => void;
   togglePin: (id: string, pinned: boolean) => void;
   deleteDocument: (id: string) => void;
}

const patchDoc = (
   folders: DocumentFolder[],
   id: string,
   fn: (d: DocumentFolder['documents'][number]) => DocumentFolder['documents'][number]
) => folders.map((f) => ({ ...f, documents: f.documents.map((d) => (d.id === id ? fn(d) : d)) }));

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
   folders: mockFolders,
   hydrated: false,

   hydrate: async () => {
      if (get().hydrated) return;
      try {
         set({ folders: await apiFetch(), hydrated: true });
      } catch (err) {
         console.error(err);
      }
   },

   getFolders: () => get().folders,
   allDocuments: () => get().folders.flatMap((f) => f.documents),

   createDocument: async (input) => {
      try {
         const doc = await apiCreate(input);
         set((s) => {
            const folders = [...s.folders];
            if (folders[0])
               folders[0] = { ...folders[0], documents: [...folders[0].documents, doc] };
            return { folders };
         });
      } catch (err) {
         toast.error('Failed to create document');
         console.error(err);
      }
   },

   renameDocument: (id, name) => {
      const snapshot = get().folders;
      set({ folders: patchDoc(snapshot, id, (d) => ({ ...d, name })) });
      apiUpdate(id, { name }).catch((err) => {
         set({ folders: snapshot });
         toast.error('Failed to rename');
         console.error(err);
      });
   },

   togglePin: (id, pinned) => {
      const snapshot = get().folders;
      set({ folders: patchDoc(snapshot, id, (d) => ({ ...d, pinned })) });
      apiUpdate(id, { pinned }).catch((err) => {
         set({ folders: snapshot });
         toast.error('Failed to update');
         console.error(err);
      });
   },

   deleteDocument: (id) => {
      const snapshot = get().folders;
      set({
         folders: snapshot.map((f) => ({
            ...f,
            documents: f.documents.filter((d) => d.id !== id),
         })),
      });
      apiDelete(id).catch((err) => {
         set({ folders: snapshot });
         toast.error('Failed to delete');
         console.error(err);
      });
   },
}));
