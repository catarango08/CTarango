'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * A notes field that saves itself on blur.
 *
 * Corey types these standing at a panel with one hand — there is no room for a
 * Save button he might forget. Saving on blur means walking away still keeps
 * the text, and the indicator tells him it landed.
 */
export function JobNotes({
  jobId,
  field,
  label,
  help,
  placeholder,
  initial,
  rows = 6,
}: {
  jobId: string;
  field: string;
  label: string;
  help?: string;
  placeholder?: string;
  initial: string;
  rows?: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (value === initial && saved === 'idle') return;
    if (value === initial) return;

    setSaved('saving');
    setError(null);
    try {
      const res = await fetch(`/api/records/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      setSaved('ok');
      router.refresh();
    } catch (err) {
      setSaved('error');
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        <span className="text-[11px]">
          {saved === 'saving' && <span className="text-[color:var(--ink-muted)]">saving…</span>}
          {saved === 'ok' && <span className="text-[color:var(--go)]">saved</span>}
          {saved === 'error' && <span className="text-[color:var(--hazard)]">{error}</span>}
        </span>
      </span>
      <textarea
        className="input mt-1 leading-relaxed"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          if (saved !== 'idle') setSaved('idle');
        }}
        onBlur={save}
      />
      {help && <span className="mt-1 block text-xs text-[color:var(--ink-muted)]">{help}</span>}
    </label>
  );
}

/** Same idea for the short single-line fields. */
export function JobField({
  jobId,
  field,
  label,
  placeholder,
  initial,
  type = 'text',
  options,
}: {
  jobId: string;
  field: string;
  label: string;
  placeholder?: string;
  initial: string;
  type?: 'text' | 'number';
  options?: readonly string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<'idle' | 'ok' | 'error'>('idle');

  async function save(next: string) {
    if (next === initial) return;
    try {
      const res = await fetch(`/api/records/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: type === 'number' ? Number(next) || 0 : next }),
      });
      setSaved(res.ok ? 'ok' : 'error');
      if (res.ok) router.refresh();
    } catch {
      setSaved('error');
    }
  }

  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        {saved === 'ok' && <span className="text-[11px] text-[color:var(--go)]">saved</span>}
        {saved === 'error' && <span className="text-[11px] text-[color:var(--hazard)]">not saved</span>}
      </span>
      {options ? (
        <select
          className="input mt-1"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            void save(e.target.value);
          }}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          className="input mt-1"
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            if (saved !== 'idle') setSaved('idle');
          }}
          onBlur={(e) => void save(e.target.value)}
        />
      )}
    </label>
  );
}
