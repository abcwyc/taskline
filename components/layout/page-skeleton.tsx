'use client';

import { useLanguage } from '@/components/providers/language-provider';

/**
 * Loading fallback shaped like the per-page content card, so scoped
 * `loading.tsx` boundaries swap only the content area while the persistent
 * sidebar stays untouched.
 */
export default function PageSkeleton() {
   const { t } = useLanguage();
   return (
      <div
         aria-busy="true"
         aria-label={t('Loading')}
         className="lg:border lg:rounded-md overflow-hidden flex flex-col items-start justify-start bg-container h-full w-full animate-pulse"
      >
         <div className="w-full h-10 shrink-0 border-b bg-muted/60" />
         <div className="w-full flex-1 p-4 space-y-3 overflow-hidden">
            <div className="h-5 w-1/4 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-4 w-3/5 rounded bg-muted" />
         </div>
      </div>
   );
}
