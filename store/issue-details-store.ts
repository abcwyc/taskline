import { useEffect } from 'react';
import { create } from 'zustand';
import { toast } from 'sonner';

import { Issue } from '@/mock-data/issues';
import {
   ActivityItem,
   getIssueDetail as mockGetIssueDetail,
   IssueDetail,
} from '@/mock-data/issue-details';

import { fetchIssueDetail, postIssueComment, setIssueSubscription } from '@/lib/api/issue-details';

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
      fetchIssueDetail(key, issue)
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
      const optimistic: ActivityItem = {
         kind: 'comment',
         id: `pending-${Date.now()}`,
         actor:
            current.activity.find((a) => a.kind === 'comment')?.actor ??
            current.activity[0]?.actor!,
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
}));

/** Ensures the fetch and returns the detail (mock fallback until it lands). */
export function useIssueDetail(issue: Issue | undefined): IssueDetail | null {
   const ensureDetail = useIssueDetailsStore((s) => s.ensureDetail);
   const detail = useIssueDetailsStore((s) =>
      issue ? s.byIdentifier[issue.identifier] : undefined
   );

   useEffect(() => {
      if (issue) ensureDetail(issue);
   }, [ensureDetail, issue]);

   if (!issue) return null;
   return detail ?? mockGetIssueDetail(issue);
}
