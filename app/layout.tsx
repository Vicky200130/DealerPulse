import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { NO_FLASH_SCRIPT } from '@/lib/theme';
import { SIDEBAR_NO_FLASH_SCRIPT } from '@/lib/sidebar';

export const metadata: Metadata = {
  title: 'DealerPulse',
  description: 'Real-time performance dashboard for automotive dealership networks.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_NO_FLASH_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <MobileNav />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
