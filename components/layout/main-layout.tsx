import React from 'react';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
   children: React.ReactNode;
   header?: React.ReactNode;
   headersNumber?: 1 | 2;
}

const isEmptyHeader = (header: React.ReactNode | undefined): boolean => {
   if (!header) return true;

   if (React.isValidElement(header) && header.type === React.Fragment) {
      const props = header.props as { children?: React.ReactNode };

      if (!props.children) return true;

      if (Array.isArray(props.children) && props.children.length === 0) {
         return true;
      }
   }

   return false;
};

/**
 * The content card rendered by each page (header + scrollable body). The
 * persistent shell around it — sidebar, command palette, outer frame — lives
 * in `app/[orgId]/layout.tsx` so it survives navigation.
 */
export default function MainLayout({ children, header, headersNumber = 2 }: MainLayoutProps) {
   const height = {
      1: 'h-[calc(100svh-40px)] lg:h-[calc(100svh-56px)]',
      2: 'h-[calc(100svh-80px)] lg:h-[calc(100svh-96px)]',
   };
   return (
      <div className="lg:border lg:rounded-md overflow-hidden flex flex-col items-center justify-start bg-container h-full w-full">
         {header}
         <div
            className={cn(
               'overflow-auto w-full',
               isEmptyHeader(header) ? 'h-full' : height[headersNumber as keyof typeof height]
            )}
         >
            {children}
         </div>
      </div>
   );
}
