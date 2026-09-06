'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlaceholderConfig } from './placeholder-sections';

/** Hand-drawn-style dashed smiley used by the empty states. */
function DashedSmiley() {
   return (
      <svg
         width="130"
         height="78"
         viewBox="0 0 130 78"
         fill="none"
         className="text-foreground/70"
         aria-hidden
      >
         <ellipse
            cx="65"
            cy="39"
            rx="60"
            ry="32"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="7 6"
            strokeLinecap="round"
         />
         <path
            d="M48 28c2 4 3 6 2 9"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
         />
         <path
            d="M78 26c2 4 3 6 2 9"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
         />
         <path
            d="M44 47c8 7 28 8 40-2"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="5 5"
         />
      </svg>
   );
}

/**
 * Generic settings page used by the sections that don't have a dedicated
 * UI yet (SLAs, project labels, emojis, …): title, filter input, primary
 * action and a friendly empty state.
 */
export default function SettingsPlaceholder({ config }: { config: PlaceholderConfig }) {
   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-4xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-medium">{config.title}</h1>
            {config.description && (
               <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            )}

            <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
               This section isn&apos;t available in this build yet.
            </div>

            <div className="flex items-center justify-between gap-3 mt-6 opacity-50 pointer-events-none">
               <Input placeholder="Filter by name..." className="w-72 h-8" disabled />
               {config.actionLabel && (
                  <Button size="xs" disabled>
                     {config.actionLabel}
                  </Button>
               )}
            </div>

            <div className="flex flex-col items-center justify-center gap-5 py-32">
               <DashedSmiley />
               <p className="text-sm text-muted-foreground">{config.emptyLabel}</p>
            </div>
         </div>
      </div>
   );
}
