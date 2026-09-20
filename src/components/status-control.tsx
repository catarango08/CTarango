'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

/** Inline status changer used on job, estimate, invoice and permit pages. */
export function StatusControl({
  db,
  id,
  field = 'status',
  value,
  options,
}: {
  db: string;
  id: string;
  field?: string;
  value: string;
  options: readonly string[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function change(next: string) {
    const previous = current;
    setCurrent(next);
    setError(null);
    try {
      const res = await fetch(`/api/records/${db}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Update failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setCurrent(previous);
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <select
        className="input w-auto py-1 text-sm"
        value={current}
        disabled={pending}
        onChange={(e) => void change(e.target.value)}
        aria-label="Change status"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      {error && <span className="text-xs text-rose-300">{error}</span>}
    </span>
  );
}
