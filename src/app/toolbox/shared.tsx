'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_EDITION, EDITIONS, isReady, type Edition, type EditionTable } from '@/lib/toolbox/types';

const KEY = 'te-nec-edition';

export function useEdition(): [Edition, (e: Edition) => void] {
  const [e, setE] = useState<Edition>(DEFAULT_EDITION);
  useEffect(() => { const v = localStorage.getItem(KEY); if (v && (EDITIONS as readonly string[]).includes(v)) setE(v as Edition); }, []);
  return [e, (v) => { setE(v); localStorage.setItem(KEY, v); }];
}

export function EditionPicker({ edition, onChange }: { edition: Edition; onChange: (e: Edition) => void }) {
  return (
    <div role="radiogroup" aria-label="NEC edition" className="grid grid-cols-3 gap-1">
      {EDITIONS.map((e) => (
        <button key={e} type="button" role="radio" aria-checked={edition === e} onClick={() => onChange(e)}
          className={`btn min-h-12 justify-center text-base ${edition === e ? 'btn-primary' : ''}`}>NEC {e}</button>
      ))}
    </div>
  );
}

/** Cites the tables a tool uses for the chosen edition. */
export function Cite({ tables, edition }: { tables: EditionTable<unknown>[]; edition: Edition }) {
  return (
    <p className="text-xs text-[color:var(--ink-muted)]" data-testid="cite">
      NEC {edition}: {tables.map((t) => t.label).join(' · ')}
      {tables.some((t) => !isReady(t)) ? ' — pending review' : ''}
    </p>
  );
}

export function Ahj() {
  return <p className="rounded bg-[color:var(--surface-2)] p-2 text-xs" data-testid="ahj">⚠️ Verify with AHJ. Local amendments and the adopted edition govern. Reference only.</p>;
}

/** Shown instead of results until Sparky supplies and reviews the table. */
export function PendingGate({ tables, edition, children }: { tables: EditionTable<unknown>[]; edition: Edition; children: ReactNode }) {
  const waiting = tables.filter((t) => !isReady(t));
  if (!waiting.length) return <>{children}</>;
  return (
    <div className="rounded-lg border-2 border-dashed border-orange-500 p-3" data-testid="pending">
      <p className="text-base font-semibold">⏳ Table pending review</p>
      <p className="mt-1 text-sm">Results stay off until Sparky supplies and checks the NEC {edition} data:</p>
      <ul className="mt-1 list-disc pl-5 text-sm">{waiting.map((t) => <li key={t.label}>{t.label}</li>)}</ul>
    </div>
  );
}

export function Num({ label, value, onChange, suffix, step }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; step?: string }) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <span className="mt-1 flex items-center gap-1">
        <input inputMode="decimal" type="number" step={step ?? 'any'} min="0" value={value} onChange={(e) => onChange(e.target.value)} className="input min-h-12 w-full text-base" />
        {suffix && <span className="text-sm text-[color:var(--ink-muted)]">{suffix}</span>}
      </span>
    </label>
  );
}

export function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold">{label}</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)} className={`btn min-h-12 justify-center px-1 text-sm ${value === o.v ? 'btn-primary' : ''}`}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

export function Pick({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs font-semibold">{label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1 min-h-12 w-full text-base">
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function Result({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-[color:var(--surface-2)] p-3 text-base" data-testid="result">{children}</div>;
}
export const n = (s: string) => (s.trim() === '' ? undefined : Number(s));
