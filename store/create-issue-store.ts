import { Status } from '@/mock-data/status';
import type { Issue } from '@/mock-data/issues';
import { create } from 'zustand';

interface CreateIssueState {
   isOpen: boolean;
   defaultStatus: Status | null;
   parentIssue: Issue | null;

   /** `status` seeds the status field; `parentIssue` makes it a sub-issue. */
   openModal: (opts?: { status?: Status | null; parentIssue?: Issue }) => void;
   closeModal: () => void;
   setDefaultStatus: (status: Status | null) => void;
}

export const useCreateIssueStore = create<CreateIssueState>((set) => ({
   isOpen: false,
   defaultStatus: null,
   parentIssue: null,

   openModal: (opts = {}) =>
      set({
         isOpen: true,
         defaultStatus: opts.status ?? null,
         parentIssue: opts.parentIssue ?? null,
      }),
   closeModal: () => set({ isOpen: false, parentIssue: null }),
   setDefaultStatus: (status) => set({ defaultStatus: status }),
}));
