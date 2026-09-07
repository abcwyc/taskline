import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

const unavailableAppRoute = /^\/[^/]+\/(?:agent|reviews|review)(?:\/|$)/;
const unavailableTeamRoute = /^\/[^/]+\/team\/[^/]+\/documents(?:\/|$)/;
const unavailableSettingRoute =
   /^\/[^/]+\/settings\/(?:agent-personalization|ai|asks|code-and-reviews|connected-accounts|customer-requests|documents|emojis|initiatives|integrations|issue-templates|notifications|project-labels|project-statuses|project-templates|project-updates|pulse|releases|slas)(?:\/|$)/;

export const middleware = auth((request) => {
   const path = request.nextUrl.pathname;
   if (
      unavailableAppRoute.test(path) ||
      unavailableTeamRoute.test(path) ||
      unavailableSettingRoute.test(path)
   ) {
      const orgSlug = path.split('/')[1];
      return NextResponse.redirect(new URL(`/${orgSlug}/my-issues`, request.url));
   }
});

export const config = {
   // Guard pages only. API routes do their own auth via `requireContext()` so
   // they can return a JSON 401 instead of an HTML redirect.
   matcher: [
      '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
   ],
};
