'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { AppLocale, browserLocale, setI18nLocale, translate } from '@/lib/i18n';
import { useMeStore } from '@/store/me-store';

interface LanguageContextValue {
   locale: AppLocale;
   t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
   locale: 'en',
   t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
   const preference = useMeStore((state) => state.preferences.language);
   const [detectedLocale, setDetectedLocale] = useState<AppLocale>('en');

   useEffect(() => {
      const detect = () => setDetectedLocale(browserLocale(navigator.languages));
      detect();
      window.addEventListener('languagechange', detect);
      return () => window.removeEventListener('languagechange', detect);
   }, []);

   const locale: AppLocale = preference === 'system' ? detectedLocale : preference;

   useEffect(() => {
      document.documentElement.lang = locale;
      document.documentElement.dataset.locale = locale;
      setI18nLocale(locale);
   }, [locale]);

   const value = useMemo<LanguageContextValue>(
      () => ({ locale, t: (key) => translate(locale, key) }),
      [locale]
   );

   return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
   return useContext(LanguageContext);
}
