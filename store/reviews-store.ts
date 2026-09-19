import type { Review, ReviewCommentItem } from '@/mock-data/reviews';
import { create } from 'zustand';
import { toast } from 'sonner';

const BASE = '/api/reviews';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface CreateReviewInput {
   title: string;
   repo?: string;
   targetBranch?: string;
   sourceBranch?: string;
   resolvesIdentifier?: string | null;
   summary?: string[];
   testPlan?: { text: string; checked: boolean }[];
   diff: string;
}

interface ReviewsState {
   reviews: Review[];
   hydrated: boolean;
   hydrate: (force?: boolean) => Promise<void>;

   getReviewById: (id: string) => Review | undefined;
   forYouReviews: () => Review[];
   createdReviews: () => Review[];

   createReview: (input: CreateReviewInput) => Promise<Review | null>;
   addComment: (reviewId: string, text: string, filePath?: string | null) => Promise<boolean>;
   deleteComment: (reviewId: string, commentId: string) => void;
   setVerdict: (reviewId: string, verdict: 'approved' | 'changes_requested' | null) => void;
   setStatus: (reviewId: string, status: 'open' | 'merged' | 'closed') => void;
   removeReview: (reviewId: string) => void;
}

const patchReview = (reviews: Review[], id: string, fn: (r: Review) => Review): Review[] =>
   reviews.map((r) => (r.id === id ? fn(r) : r));

export const useReviewsStore = create<ReviewsState>((set, get) => ({
   reviews: [],
   hydrated: false,

   hydrate: async (force = false) => {
      if (get().hydrated && !force) return;
      try {
         set({ reviews: await http<Review[]>(BASE), hydrated: true });
      } catch (err) {
         console.error(err);
      }
   },

   getReviewById: (id) => get().reviews.find((r) => r.id === id),
   forYouReviews: () => get().reviews.filter((r) => r.list === 'for-you'),
   createdReviews: () => get().reviews.filter((r) => r.list === 'created'),

   createReview: async (input) => {
      try {
         const created = await http<Review>(BASE, {
            method: 'POST',
            body: JSON.stringify(input),
         });
         set((s) => ({ reviews: [created, ...s.reviews] }));
         return created;
      } catch (err) {
         toast.error((err as Error).message.split('→')[1]?.trim() || 'Failed to create review');
         console.error(err);
         return null;
      }
   },

   addComment: async (reviewId, text, filePath = null) => {
      try {
         const comment = await http<ReviewCommentItem>(
            `${BASE}/${encodeURIComponent(reviewId)}/comments`,
            { method: 'POST', body: JSON.stringify({ text, filePath }) }
         );
         set((s) => ({
            reviews: patchReview(s.reviews, reviewId, (r) => ({
               ...r,
               comments: [...(r.comments ?? []), comment],
            })),
         }));
         return true;
      } catch (err) {
         toast.error('Failed to post the comment');
         console.error(err);
         return false;
      }
   },

   deleteComment: (reviewId, commentId) => {
      const snapshot = get().reviews;
      set((s) => ({
         reviews: patchReview(s.reviews, reviewId, (r) => ({
            ...r,
            comments: (r.comments ?? []).filter((c) => c.id !== commentId),
         })),
      }));
      http<void>(
         `${BASE}/${encodeURIComponent(reviewId)}/comments/${encodeURIComponent(commentId)}`,
         {
            method: 'DELETE',
         }
      ).catch((err) => {
         set({ reviews: snapshot });
         toast.error('Failed to delete the comment');
         console.error(err);
      });
   },

   setVerdict: (reviewId, verdict) => {
      const snapshot = get().reviews;
      set((s) => ({
         reviews: patchReview(s.reviews, reviewId, (r) => ({ ...r, verdict })),
      }));
      http<Review>(`${BASE}/${encodeURIComponent(reviewId)}`, {
         method: 'PATCH',
         body: JSON.stringify({ verdict }),
      })
         .then((saved) => set((s) => ({ reviews: patchReview(s.reviews, reviewId, () => saved) })))
         .catch((err) => {
            set({ reviews: snapshot });
            toast.error('Failed to record the verdict');
            console.error(err);
         });
   },

   setStatus: (reviewId, status) => {
      const snapshot = get().reviews;
      set((s) => ({ reviews: patchReview(s.reviews, reviewId, (r) => ({ ...r, status })) }));
      http<Review>(`${BASE}/${encodeURIComponent(reviewId)}`, {
         method: 'PATCH',
         body: JSON.stringify({ status }),
      })
         .then((saved) => set((s) => ({ reviews: patchReview(s.reviews, reviewId, () => saved) })))
         .catch((err) => {
            set({ reviews: snapshot });
            toast.error('Failed to update the review status');
            console.error(err);
         });
   },

   removeReview: (reviewId) => {
      const snapshot = get().reviews;
      set((s) => ({ reviews: s.reviews.filter((r) => r.id !== reviewId) }));
      http<void>(`${BASE}/${encodeURIComponent(reviewId)}`, { method: 'DELETE' }).catch((err) => {
         set({ reviews: snapshot });
         toast.error('Failed to delete the review');
         console.error(err);
      });
   },
}));
