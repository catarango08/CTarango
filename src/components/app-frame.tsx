'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './nav';
import { SchemaNotice } from './schema-notice';

/** The login screen stands alone; everything else gets the sidebar and gutters. */
export function AppFrame({ storeKind, children }: { storeKind: 'notion' | 'demo'; children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login') return <>{children}</>;

  return (
    <>
      <Sidebar storeKind={storeKind} />
      <main className="lg:pl-60">
        <div className="safe-x mx-auto max-w-[1400px] px-4 pb-24 pt-20 lg:px-8 lg:pb-16 lg:pt-8">{storeKind === 'notion' && !/\/(quote\/[^/]+|change-order\/[^/]+|invoice)$/.test(pathname) && <SchemaNotice />}{children}</div>
      </main>
    </>
  );
}
