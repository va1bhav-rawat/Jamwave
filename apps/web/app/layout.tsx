import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AnalyticsIdentity } from '@/components/analytics/AnalyticsIdentity';
import { analyticsEnabled } from '@/lib/analytics';
import { APP_URL } from '@/lib/env';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Jamwave — Listen together, for free',
    template: '%s · Jamwave',
  },
  description:
    'Jamwave is the free way to listen to music together online: share one link and everyone hears the same song at the same second. No app, no account to join, no ads.',
  applicationName: 'Jamwave',
  appleWebApp: { capable: true, title: 'Jamwave', statusBarStyle: 'black-translucent' },
  // Every page is its own canonical; Next resolves this against metadataBase per route.
  alternates: { canonical: './' },
  ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
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
    <html lang="en-IN" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        {analyticsEnabled ? <AnalyticsIdentity /> : null}
        <Toaster theme="dark" position="top-center" richColors closeButton duration={3500} />
      </body>
    </html>
  );
}
