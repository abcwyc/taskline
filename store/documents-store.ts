import type { DocumentFolder } from '@/mock-data/documents';
import { create } from 'zustand';
import { toast } from 'sonner';

import {
   createDocument as apiCreate,
   deleteDocument as apiDelete,
   fetchDocumentFolders as apiFetch,
   updateDocument as apiUpdate,
} from '@/lib/api/documents';
import {
   createFolder as apiCreateFolder,
   deleteFolder as apiDeleteFolder,
   updateFolder as apiUpdateFolder,
} from '@/lib/api/folders';
import type { DocumentCreateBody } from '@/lib/api/types';
import { tt } from '@/lib/i18n';

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
   saveContent: (id: string, text: string) => void;

   createFolder: (name: string, icon?: string) => Promise<void>;
   renameFolder: (id: string, name: string) => void;
   deleteFolder: (id: string) => void;
}

const patchDoc = (
   folders: DocumentFolder[],
   id: string,
   fn: (d: DocumentFolder['documents'][number]) => DocumentFolder['documents'][number]
) => folders.map((f) => ({ ...f, documents: f.documents.map((d) => (d.id === id ? fn(d) : d)) }));

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
   folders: [],
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
         toast.error(tt('Failed to create document'));
         console.error(err);
      }
   },

   renameDocument: (id, name) => {
      const snapshot = get().folders;
      set({ folders: patchDoc(snapshot, id, (d) => ({ ...d, name })) });
      apiUpdate(id, { name }).catch((err) => {
         set({ folders: snapshot });
         toast.error(tt('Failed to rename'));
         console.error(err);
      });
   },

   togglePin: (id, pinned) => {
      const snapshot = get().folders;
      set({ folders: patchDoc(snapshot, id, (d) => ({ ...d, pinned })) });
      apiUpdate(id, { pinned }).catch((err) => {
         set({ folders: snapshot });
         toast.error(tt('Failed to update'));
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
         toast.error(tt('Failed to delete'));
         console.error(err);
      });
   },

   saveContent: (id, text) => {
      const snapshot = get().folders;
      // keep the list's "last edited" fresh; content itself isn't part of the list state
      set({
         folders: patchDoc(snapshot, id, (d) => ({
            ...d,
            updatedAt: new Date().toISOString().slice(0, 10),
         })),
      });
      apiUpdate(id, { content: { text } }).catch((err) => {
         set({ folders: snapshot });
         toast.error(tt('Failed to update'));
         console.error(err);
      });
   },

   createFolder: async (name, icon) => {
      try {
         const folder = await apiCreateFolder({ name, icon });
         set((s) => ({ folders: [...s.folders, folder] }));
      } catch (err) {
         toast.error(tt('Failed to create folder'));
         console.error(err);
      }
   },

   renameFolder: (id, name) => {
      const snapshot = get().folders;
      set({ folders: snapshot.map((f) => (f.id === id ? { ...f, name } : f)) });
      apiUpdateFolder(id, { name }).catch((err) => {
         set({ folders: snapshot });
         toast.error(tt('Failed to rename folder'));
         console.error(err);
      });
   },

   deleteFolder: (id) => {
      const snapshot = get().folders;
      set({ folders: snapshot.filter((f) => f.id !== id) });
      apiDeleteFolder(id).catch((err) => {
         set({ folders: snapshot });
         toast.error(
            (err as Error).message.includes('409')
               ? tt('Folder must be empty before deleting')
               : tt('Failed to delete folder')
         );
         console.error(err);
      });
   },
}));
