'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { INTEGRATION_LOGOS } from './integration-logos';
import { INTEGRATION_CATEGORIES, INTEGRATIONS, Integration } from './integrations-data';

/** How many cards a category shows before "Show all". */
const VISIBLE_PER_CATEGORY = 8;

function IntegrationIcon({ integration, size = 36 }: { integration: Integration; size?: number }) {
   const Logo = INTEGRATION_LOGOS[integration.id];
   if (Logo) {
      return (
         <span
            className="rounded-md border bg-background inline-flex items-center justify-center shrink-0"
            style={{ width: size, height: size }}
            aria-hidden
         >
            <Logo className="size-[60%]" />
         </span>
      );
   }
   const initials = integration.name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
   return (
      <span
         className="rounded-md inline-flex items-center justify-center font-semibold text-white shrink-0 select-none"
         style={{
            width: size,
            height: size,
            backgroundColor: integration.color,
            fontSize: size * 0.34,
         }}
         aria-hidden
      >
         {initials}
      </span>
   );
}

/** Honest availability tag — none of these can be connected in this build. */
function NotAvailableTag() {
   return (
      <span className="text-[11px] text-muted-foreground border rounded px-1 py-px leading-none shrink-0">
         Not available in this build
      </span>
   );
}

function IntegrationCard({ integration }: { integration: Integration }) {
   return (
      <div className="flex items-start gap-3 rounded-lg border bg-container p-3">
         <IntegrationIcon integration={integration} />
         <span className="flex flex-col gap-0.5 min-w-0">
            <span className="flex items-center gap-2 min-w-0">
               <span className="text-sm font-medium truncate">{integration.name}</span>
               <NotAvailableTag />
            </span>
            <span className="text-xs text-muted-foreground line-clamp-2">
               {integration.description}
            </span>
         </span>
      </div>
   );
}

function CategorySection({ label, items }: { label: string; items: Integration[] }) {
   const [expanded, setExpanded] = useState(false);
   const visible = expanded ? items : items.slice(0, VISIBLE_PER_CATEGORY);
   return (
      <section className="flex flex-col gap-3">
         <h2 className="text-base font-medium">{label}</h2>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {visible.map((integration) => (
               <IntegrationCard key={integration.id} integration={integration} />
            ))}
         </div>
         {!expanded && items.length > VISIBLE_PER_CATEGORY && (
            <button
               onClick={() => setExpanded(true)}
               className="self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
               Show all
            </button>
         )}
      </section>
   );
}

/**
 * Workspace "Integrations" settings. Circle runs self-hosted and does not
 * bundle third-party SaaS integrations in this build, so this page keeps the
 * catalog purely as a browsable reference — nothing here can be connected.
 */
export default function Integrations() {
   const [query, setQuery] = useState('');

   const searchResults = useMemo(() => {
      const needle = query.trim().toLowerCase();
      if (!needle) return null;
      return Object.values(INTEGRATIONS).filter(
         (integration) =>
            integration.name.toLowerCase().includes(needle) ||
            integration.description.toLowerCase().includes(needle)
      );
   }, [query]);

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
            <div className="flex flex-col gap-1">
               <h1 className="text-2xl font-medium">Integrations</h1>
               <p className="text-sm text-muted-foreground">
                  Circle runs self-hosted and does not bundle third-party SaaS integrations in this
                  build.
               </p>
            </div>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
               The list below is a reference catalog of common integrations — none of them can be
               connected or configured in this build.
            </div>

            <div className="relative">
               <Search className="size-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
               <Input
                  placeholder="Search integrations"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-8 h-9"
               />
            </div>

            {searchResults ? (
               <section className="flex flex-col gap-3">
                  <h2 className="text-base font-medium">
                     {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                     {searchResults.map((integration) => (
                        <IntegrationCard key={integration.id} integration={integration} />
                     ))}
                  </div>
               </section>
            ) : (
               INTEGRATION_CATEGORIES.map((category) => (
                  <CategorySection
                     key={category.id}
                     label={category.label}
                     items={category.items.map((id) => INTEGRATIONS[id])}
                  />
               ))
            )}
         </div>
      </div>
   );
}
