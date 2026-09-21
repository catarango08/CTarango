import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppFrame } from '@/components/app-frame';
import { ThemeScript } from '@/components/theme-toggle';
import { getStore } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Tarango Electric — field desk',
  description: 'Service, panels, standby, farm and shop. Bolivar, Buffalo, Marshfield.',
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
    { media: '(prefers-color-scheme: light)', color: '#F5F1E8' },
    { media: '(prefers-color-scheme: dark)', color: '#222426' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const storeKind = getStore().kind;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased">
        <AppFrame storeKind={storeKind}>{children}</AppFrame>
      </body>
    </html>
  );
}
