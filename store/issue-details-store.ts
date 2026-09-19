import { useEffect } from 'react';
import { create } from 'zustand';
import { toast } from 'sonner';

import type { Issue } from '@/mock-data/issues';
import type { ActivityItem, IssueDetail } from '@/mock-data/issue-details';
import {
   addIssueRelation,
   addPrLink,
   deleteIssueComment,
   fetchIssueDetail,
   postIssueComment,
   removeIssuePrLink,
   removeIssueRelation,
   setIssueSubscription,
   updateIssueComment,
} from '@/lib/api/issue-details';
import type { RelationEntry } from '@/mock-data/issue-details';
import { useMeStore } from '@/store/me-store';
import { useMembersStore } from '@/store/members-store';

/**
 * Per-issue detail cache (rich description, comments, activity, relations,
 * PR links). Lazy — `useIssueDetail(issue)` fetches on first view.
 */
interface IssueDetailsState {
   byIdentifier: Record<string, IssueDetail>;
   loading: Record<string, boolean>;

   ensureDetail: (issue: Issue) => void;
   getDetail: (identifier: string) => IssueDetail | undefined;
   postComment: (identifier: string, text: string) => void;
   editComment: (identifier: string, commentId: string, text: string) => void;
   deleteComment: (identifier: string, commentId: string) => void;
   addRelation: (
      identifier: string,
      relatedId: string,
      type: RelationEntry['type']
   ) => Promise<boolean>;
   removeRelation: (identifier: string, relationId: string) => void;
   addPullRequest: (identifier: string, title: string, url: string) => Promise<boolean>;
   removePullRequest: (identifier: string, prLinkId: string) => void;
   /** Drop the cached detail so the next view refetches (e.g. after a sub-issue is added). */
   invalidate: (identifier: string) => void;
   toggleSubscription: (identifier: string) => void;
}

export const useIssueDetailsStore = create<IssueDetailsState>((set, get) => ({
   byIdentifier: {},
   loading: {},

   ensureDetail: (issue) => {
      const key = issue.identifier;
      if (get().byIdentifier[key] || get().loading[key]) return;
      set((s) => ({ loading: { ...s.loading, [key]: true } }));
      fetchIssueDetail(key)
         .then((detail) =>
            set((s) => ({
               byIdentifier: { ...s.byIdentifier, [key]: detail },
               loading: { ...s.loading, [key]: false },
            }))
         )
         .catch((err) => {
            set((s) => ({ loading: { ...s.loading, [key]: false } }));
            console.error(err);
         });
   },

   getDetail: (identifier) => get().byIdentifier[identifier],

   invalidate: (identifier) =>
      set((s) => {
         if (!s.byIdentifier[identifier]) return {};
         const next = { ...s.byIdentifier };
         delete next[identifier];
         return { byIdentifier: next };
      }),

   toggleSubscription: (identifier) => {
      const current = get().byIdentifier[identifier];
      if (!current) return;
      const next = !current.subscribed;
      set((s) => ({
         byIdentifier: { ...s.byIdentifier, [identifier]: { ...current, subscribed: next } },
      }));
      setIssueSubscription(identifier, next).catch(() => {
         set((s) => {
            const d = s.byIdentifier[identifier];
            return d
               ? { byIdentifier: { ...s.byIdentifier, [identifier]: { ...d, subscribed: !next } } }
               : {};
         });
         toast.error('Failed to update subscription');
      });
   },

   postComment: (identifier, text) => {
      const current = get().byIdentifier[identifier];
      if (!current) return;
      const me = useMeStore.getState().me;
      const actor =
         (me && useMembersStore.getState().getMemberById(me.id)) ??
         current.activity.find((a) => a.kind === 'comment')?.actor ??
         current.activity[0]?.actor ??
         useMembersStore.getState().members[0];
      const optimistic: ActivityItem = {
         kind: 'comment',
         id: `pending-${Date.now()}`,
         actor,
         timeAgo: 'just now',
         body: [{ type: 'paragraph', text }],
      };
      set((s) => ({
         byIdentifier: {
            ...s.byIdentifier,
            [identifier]: { ...current, activity: [...current.activity, optimistic] },
         },
      }));

      postIssueComment(identifier, text)
         .then((saved) =>
            set((s) => {
               const d = s.byIdentifier[identifier];
               if (!d) return {};
               return {
                  byIdentifier: {
                     ...s.byIdentifier,
                     [identifier]: {
                        ...d,
                        activity: d.activity.map((a) => (a.id === optimistic.id ? saved : a)),
                     },
                  },
               };
            })
         )
         .catch((err) => {
            set((s) => {
               const d = s.byIdentifier[identifier];
               if (!d) return {};
               return {
                  byIdentifier: {
                     ...s.byIdentifier,
                     [identifier]: {
                        ...d,
                        activity: d.activity.filter((a) => a.id !== optimistic.id),
                     },
                  },
               };
            });
            toast.error('Failed to post comment');
            console.error(err);
         });
   },
   editComment: (identifier, commentId, text) => {
      const current = get().byIdentifier[identifier];
      if (!current) return;
      updateIssueComment(identifier, commentId, text)
         .then((saved) =>
            set((s) => {
               const d = s.byIdentifier[identifier];
               if (!d) return {};
               return {
                  byIdentifier: {
                     ...s.byIdentifier,
                     [identifier]: {
                        ...d,
                        activity: d.activity.map((a) => (a.id === commentId ? saved : a)),
                     },
                  },
               };
            })
         )
         .catch((err) => {
            toast.error('Failed to edit comment');
            console.error(err);
         });
   },

   deleteComment: (identifier, commentId) => {
      const snapshot = get().byIdentifier[identifier];
      if (!snapshot) return;
      set((s) => {
         const d = s.byIdentifier[identifier];
         if (!d) return {};
         return {
            byIdentifier: {
               ...s.byIdentifier,
               [identifier]: {
                  ...d,
                  activity: d.activity.filter((a) => a.id !== commentId),
               },
            },
         };
      });
      deleteIssueComment(identifier, commentId).catch((err) => {
         set((s) => ({ byIdentifier: { ...s.byIdentifier, [identifier]: snapshot } }));
         toast.error('Failed to delete comment');
         console.error(err);
      });
   },

   addRelation: async (identifier, relatedId, type) => {
      try {
         const relation = await addIssueRelation(identifier, relatedId, type);
         set((s) => {
            const d = s.byIdentifier[identifier];
            if (!d) return {};
            const detail: IssueDetail = {
               ...d,
               relationEntries: [...(d.relationEntries ?? []), relation],
               ...(type === 'blocked-by'
                  ? { blockedByIds: [...(d.blockedByIds ?? []), relation.targetIdentifier] }
                  : {}),
               ...(type === 'blocks'
                  ? { blocksIds: [...(d.blocksIds ?? []), relation.targetIdentifier] }
                  : {}),
               ...(type === 'related' || type === 'duplicate'
                  ? { relatedIds: [...(d.relatedIds ?? []), relation.targetIdentifier] }
                  : {}),
            };
            return { byIdentifier: { ...s.byIdentifier, [identifier]: detail } };
         });
         return true;
      } catch (err) {
         toast.error(
            (err as Error).message.includes('already related')
               ? 'These issues are already related'
               : 'Failed to add relation'
         );
         console.error(err);
         return false;
      }
   },

   removeRelation: (identifier, relationId) => {
      const snapshot = get().byIdentifier[identifier];
      if (!snapshot) return;
      set((s) => {
         const d = s.byIdentifier[identifier];
         if (!d) return {};
         const removed = (d.relationEntries ?? []).find((r) => r.id === relationId);
         const detail: IssueDetail = {
            ...d,
            relationEntries: (d.relationEntries ?? []).filter((r) => r.id !== relationId),
            blockedByIds: removed
               ? (d.blockedByIds ?? []).filter((i) => i !== removed.targetIdentifier)
               : d.blockedByIds,
            blocksIds: removed
               ? (d.blocksIds ?? []).filter((i) => i !== removed.targetIdentifier)
               : d.blocksIds,
            relatedIds: removed
               ? (d.relatedIds ?? []).filter((i) => i !== removed.targetIdentifier)
               : d.relatedIds,
         };
         return { byIdentifier: { ...s.byIdentifier, [identifier]: detail } };
      });
      removeIssueRelation(identifier, relationId).catch((err) => {
         set((s) => ({ byIdentifier: { ...s.byIdentifier, [identifier]: snapshot } }));
         toast.error('Failed to remove relation');
         console.error(err);
      });
   },

   addPullRequest: async (identifier, title, url) => {
      try {
         const link = await addPrLink(identifier, title, url);
         set((s) => {
            const d = s.byIdentifier[identifier];
            if (!d) return {};
            return {
               byIdentifier: {
                  ...s.byIdentifier,
                  [identifier]: { ...d, prLinks: [...(d.prLinks ?? []), link] },
               },
            };
         });
         return true;
      } catch (err) {
         toast.error('Failed to link the pull request');
         console.error(err);
         return false;
      }
   },

   removePullRequest: (identifier, prLinkId) => {
      const snapshot = get().byIdentifier[identifier];
      if (!snapshot) return;
      set((s) => {
         const d = s.byIdentifier[identifier];
         if (!d) return {};
         return {
            byIdentifier: {
               ...s.byIdentifier,
               [identifier]: { ...d, prLinks: (d.prLinks ?? []).filter((p) => p.id !== prLinkId) },
            },
         };
      });
      removeIssuePrLink(identifier, prLinkId).catch((err) => {
         set((s) => ({ byIdentifier: { ...s.byIdentifier, [identifier]: snapshot } }));
         toast.error('Failed to unlink the pull request');
         console.error(err);
      });
   },
}));

/** Ensures the fetch and returns only persisted detail data. */
export function useIssueDetail(issue: Issue | undefined): IssueDetail | null {
   const ensureDetail = useIssueDetailsStore((s) => s.ensureDetail);
   const detail = useIssueDetailsStore((s) =>
      issue ? s.byIdentifier[issue.identifier] : undefined
   );

   useEffect(() => {
      if (issue) ensureDetail(issue);
   }, [ensureDetail, issue]);

   if (!issue) return null;
   return detail ?? null;
}
