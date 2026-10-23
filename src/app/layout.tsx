import type { Metadata, Viewport } from 'next';
import { Anton, Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { AppFrame } from '@/components/app-frame';
import { ThemeScript } from '@/components/theme-toggle';
import { getStore } from '@/lib/store';

const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton', display: 'swap' });
const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-barlow', display: 'swap' });
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-barlow-condensed', display: 'swap' });

export const metadata: Metadata = {
  title: 'Tarango Electric — field desk',
  description: 'Electrical service, panels and generator hookups from Elkland. Bolivar, Buffalo, Marshfield, Fair Grove, Elkland, and Dallas, Polk, Webster and Greene counties.',
  applicationName: 'Tarango',
  appleWebApp: {
    capable: true,
    title: 'Tarango',
    // Charcoal bar behind the iOS status bar, so the notch matches the app.
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the layout run under the notch; the CSS pads it back with safe-area insets.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0C0C' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const storeKind = getStore().kind;
  return (
    <html lang="en" suppressHydrationWarning className={`${anton.variable} ${barlow.variable} ${barlowCondensed.variable}`}>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased">
        <AppFrame storeKind={storeKind}>{children}</AppFrame>
      </body>
    </html>
  );
}
