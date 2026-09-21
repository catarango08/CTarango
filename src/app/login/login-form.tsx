'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: value }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'That did not work');
        setValue('');
        return;
      }
      router.replace(next && next.startsWith('/') ? next : '/');
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="block">
        <span className="label">Passcode</span>
        <input
          className="input mt-1 text-center text-lg tracking-[0.3em]"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      </label>
      <button type="submit" className="btn-primary mt-3 min-h-12 w-full justify-center" disabled={busy || !value}>
        {busy ? 'Checking…' : 'Open the desk'}
      </button>
      {error && <p className="mt-2 text-center text-sm text-[color:var(--hazard)]">{error}</p>}
      <p className="mt-3 text-center text-xs text-[color:var(--ink-muted)]">
        Stays signed in for 90 days on this device.
      </p>
    </form>
  );
}
