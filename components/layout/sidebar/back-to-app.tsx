'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useLanguage } from '@/components/providers/language-provider';

export function BackToApp() {
   const { t } = useLanguage();
   return (
      <div className="w-full flex items-center justify-between gap-2">
         <Button className="w-fit" size="xs" variant="outline" asChild>
            <Link href="/">
               <ChevronLeft className="size-4" />
               {t('Back to app')}
            </Link>
         </Button>
         <ThemeToggle />
      </div>
   );
}
