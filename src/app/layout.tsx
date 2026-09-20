import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/nav';
import { getStore } from '@/lib/store';

export const metadata: Metadata = {
  title: 'VoltFlow — Electrical Service Operations',
  description: 'CRM, dispatch, job photos, estimating, invoicing and compliance for an electrical contractor. Runs on Notion.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const storeKind = getStore().kind;
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <Sidebar storeKind={storeKind} />
        <main className="lg:pl-60">
          <div className="mx-auto max-w-[1500px] px-4 py-6 pt-16 lg:px-8 lg:pt-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
