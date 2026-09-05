import NextAuth from 'next-auth';

import { authConfig } from '@/lib/auth.config';

// Edge route guard: the `authorized` callback in authConfig redirects
// unauthenticated requests to /sign-in.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
   // Guard pages only. API routes do their own auth via `requireContext()` so
   // they can return a JSON 401 instead of an HTML redirect.
   matcher: [
      '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
   ],
};
