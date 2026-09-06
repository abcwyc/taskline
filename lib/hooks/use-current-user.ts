'use client';

import { useSession } from 'next-auth/react';

import type { User } from '@/mock-data/users';
import { useMembersStore } from '@/store/members-store';

/** The signed-in user's id (from the Auth.js session). */
export function useCurrentUserId(): string | undefined {
   return useSession().data?.user?.id;
}

/** The full member record for the signed-in user (from the members cache). */
export function useCurrentUser(): User | undefined {
   const id = useCurrentUserId();
   return useMembersStore((s) => (id ? s.getMemberById(id) : undefined));
}

/** True when the signed-in user may mutate workspace content (Admin or Member). */
export function useCanWrite(): boolean {
   const role = useCurrentUser()?.role;
   // default to true until the members cache resolves, so controls don't flicker
   return role === undefined || role === 'Admin' || role === 'Member';
}

/** True when the signed-in user is a workspace Admin. */
export function useIsAdmin(): boolean {
   return useCurrentUser()?.role === 'Admin';
}
