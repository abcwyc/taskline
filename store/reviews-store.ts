import { Review, reviews as mockReviews } from '@/mock-data/reviews';
import { create } from 'zustand';

const BASE = '/api/reviews';

interface ReviewsState {
   reviews: Review[];
   hydrated: boolean;
   hydrate: () => Promise<void>;

   getReviewById: (id: string) => Review | undefined;
   forYouReviews: () => Review[];
   createdReviews: () => Review[];
}

export const useReviewsStore = create<ReviewsState>((set, get) => ({
   reviews: mockReviews,
   hydrated: false,

   hydrate: async () => {
      if (get().hydrated) return;
      try {
         const res = await fetch(BASE);
         if (res.ok) set({ reviews: (await res.json()) as Review[], hydrated: true });
      } catch (err) {
         console.error(err);
      }
   },

   getReviewById: (id) => get().reviews.find((r) => r.id === id),
   forYouReviews: () => get().reviews.filter((r) => r.list === 'for-you'),
   createdReviews: () => get().reviews.filter((r) => r.list === 'created'),
}));
