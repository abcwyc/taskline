'use client';

import { useLanguage } from './language-provider';

/** Render a translated string. Usable inside server components for static text. */
export function T({ k }: { k: string }) {
   const { t } = useLanguage();
   return <>{t(k)}</>;
}
