import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
   variable: '--font-geist-sans',
   subsets: ['latin'],
});

const geistMono = Geist_Mono({
   variable: '--font-geist-mono',
   subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3000';

export const metadata: Metadata = {
   title: {
      template: '%s | Taskline',
      default: 'Taskline — Tasks, in a line.',
   },
   description:
      'Taskline — Tasks, in a line. A self-hosted, Linear-inspired project management tool for tracking issues, projects and teams with a modern, responsive UI.',
   openGraph: {
      type: 'website',
      locale: 'en_US',
      url: siteUrl,
      siteName: 'Taskline',
      images: [
         {
            url: `${siteUrl}/banner.png`,
            width: 2560,
            height: 1440,
            alt: 'Taskline',
         },
      ],
   },
   twitter: {
      card: 'summary_large_image',
      images: [
         {
            url: `${siteUrl}/banner.png`,
            width: 2560,
            height: 1440,
            alt: 'Taskline',
         },
      ],
   },
   keywords: ['taskline', 'project management', 'issue tracking', 'tasks'],
};

import { ThemeProvider } from '@/components/layout/theme-provider';
import { LanguageProvider } from '@/components/providers/language-provider';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="en" suppressHydrationWarning>
         <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
         </head>
         <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}
            suppressHydrationWarning
         >
            <NuqsAdapter>
               <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                  <LanguageProvider>
                     {children}
                     <Toaster />
                  </LanguageProvider>
               </ThemeProvider>
            </NuqsAdapter>
         </body>
      </html>
   );
}
