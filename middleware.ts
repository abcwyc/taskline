import NextAuth from 'next-auth';

import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

// All product surfaces are enabled; the middleware only enforces authentication.
export const middleware = auth(() => {});

export const config = {
   // Guard pages only. API routes do their own auth via `requireContext()` so
   // they can return a JSON 401 instead of an HTML redirect.
   matcher: [
      '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
   ],
};
