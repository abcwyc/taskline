'use client';

import { useLanguage } from './language-provider';

/**
 * Render a translated string with `{name}` placeholders replaced, e.g.
 * `<TParams k="Invited to {org}." params={{ org: 'Acme' }} />`.
 * Usable inside server components for static text.
 */
export function TParams({ k, params }: { k: string; params: Record<string, string> }) {
   const { t } = useLanguage();
   let text = t(k);
   for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, value);
   }
   return <>{text}</>;
}
