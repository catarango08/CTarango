import { authRequired } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { Wordmark, Tagline } from '@/components/brand';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!authRequired()) redirect('/');
  const { next } = await searchParams;

  return (
    <main className="safe-top safe-bottom safe-x grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <Wordmark className="mx-auto h-24 w-full max-w-[280px] text-[color:var(--ink)]" tagline={false} />
        <p className="mt-1 text-center font-serif text-sm">
          <Tagline />
        </p>
        <div className="panel mt-6 p-4">
          <LoginForm next={next} />
        </div>
        <p className="mt-4 text-center text-xs text-[color:var(--ink-muted)]">(417) 501-4752</p>
      </div>
    </main>
  );
}
