import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { APP_URL } from '@/lib/env';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Jamwave — Listen together, for free',
    template: '%s · Jamwave',
  },
  description:
    'Jamwave is the free way to listen to music with friends and loved ones in perfect sync. Share one link, add songs to a shared queue, chat and react — no app, no account, no subscription.',
  applicationName: 'Jamwave',
  keywords: [
    'listen together',
    'free spotify jam alternative',
    'listen to music with friends online',
    'synced music',
    'jam session',
    'youtube together',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Jamwave',
    title: 'Jamwave — Listen together, for free',
    description:
      'Same song, same second, anywhere. Free synced listening with friends — no subscription needed.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jamwave — Listen together, for free',
    description: 'Same song, same second, anywhere. Free synced listening with friends.',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster theme="dark" position="top-center" richColors closeButton duration={3500} />
      </body>
    </html>
  );
}
