import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/nav';
import { ThemeScript } from '@/components/theme-toggle';
import { getStore } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Tarango Electric — field desk',
  description: 'Service, panels, standby, farm and shop. Bolivar, Buffalo, Marshfield.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const storeKind = getStore().kind;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased">
        <Sidebar storeKind={storeKind} />
        <main className="lg:pl-60">
          <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-16 lg:px-8 lg:pt-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
