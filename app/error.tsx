'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { useEffect } from 'react';

export default function GlobalError({
   error,
   reset,
}: {
   error: Error & { digest?: string };
   reset: () => void;
}) {
   const { t } = useLanguage();

   useEffect(() => {
      console.error('[app] route error', error);
   }, [error]);

   return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
         <div className="max-w-sm rounded-lg border bg-container p-6 text-center">
            <h1 className="text-base font-semibold">{t('Something went wrong')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               {t('The page could not be loaded. Your saved data is unaffected.')}
            </p>
            <button
               type="button"
               className="mt-4 rounded-md bg-foreground px-3 py-2 text-sm text-background"
               onClick={() => reset()}
            >
               {t('Try again')}
            </button>
         </div>
      </main>
   );
}
