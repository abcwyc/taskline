'use client';

export default function GlobalError({
   reset,
}: {
   error: Error & { digest?: string };
   reset: () => void;
}) {
   return (
      <html lang="en">
         <body className="min-h-svh bg-background text-foreground">
            <main className="flex min-h-svh items-center justify-center p-6">
               <div className="max-w-sm rounded-lg border p-6 text-center">
                  <h1 className="text-base font-semibold">Circle could not start</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                     Reload the application to try again.
                  </p>
                  <button
                     type="button"
                     className="mt-4 rounded-md bg-foreground px-3 py-2 text-sm text-background"
                     onClick={() => reset()}
                  >
                     Reload
                  </button>
               </div>
            </main>
         </body>
      </html>
   );
}
