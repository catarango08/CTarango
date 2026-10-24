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
          className={`${edition === e ? 'btn-primary' : 'btn'} min-h-12 justify-center text-base`}>NEC {e}</button>
      ))}
    </div>
  );
}

/** Cites the tables a tool uses for the chosen edition. */
export function Cite({ tables, edition }: { tables: EditionTable<unknown>[]; edition: Edition }) {
  return (
    <><p className="text-xs text-[color:var(--ink-muted)]" data-testid="cite">
      NEC {edition}: {tables.map((t, k) => <span key={t.label}>{k ? ' · ' : ''}{t.label}{t.verify?.length ? <VerifyBadge title={t.verify.join(' ')} /> : null}</span>)}
      {tables.some((t) => !isReady(t)) ? ' — pending review' : ''}
    </p>
    {tables.some((t) => t.verify?.length) && <ul className="text-xs text-[color:var(--ink-muted)]" data-testid="cite-verify">{tables.flatMap((t) => (t.verify ?? []).map((v) => <li key={t.label + v}>{t.label}: {v} <VerifyBadge /></li>))}</ul>}
    </>
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
          <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)} className={`${value === o.v ? 'btn-primary' : 'btn'} min-h-12 justify-center px-1 text-sm`}>{o.l}</button>
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

/** Visible flag for cells Sparky marked UNVERIFIED. Never hidden. */
export function VerifyBadge({ title }: { title?: string }) {
  return <span title={title} data-testid="verify-badge" className="ml-1 inline-block rounded bg-orange-500 px-1.5 py-0.5 align-middle text-[11px] font-bold uppercase leading-none text-white">verify</span>;
}
/** Under a result: lists the UNVERIFIED cells the result relied on. */
export function VerifyNotes({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div className="mt-2 rounded border-2 border-orange-500 p-2 text-sm" data-testid="verify-result">
      <p className="font-semibold">Result uses unverified data <VerifyBadge /></p>
      <ul className="list-disc pl-5 text-xs">{notes.map((v) => <li key={v}>{v}</li>)}</ul>
    </div>
  );
}
/** Table notes and source file from Sparky's delivery. */
export function Notes({ tables }: { tables: EditionTable<unknown>[] }) {
  const items = tables.flatMap((t) => (t.notes ?? []).map((x) => `${t.label}: ${x}`));
  return (
    <details className="text-xs text-[color:var(--ink-muted)]">
      <summary className="min-h-12 cursor-pointer py-3 font-semibold">Table notes &amp; sources</summary>
      <ul className="list-disc space-y-1 pl-5">{items.map((x) => <li key={x}>{x}</li>)}{tables.map((t) => <li key={t.label + 's'}>{t.label}: {t.source}{t.reviewedBy ? ` (supplied by ${t.reviewedBy}, ${t.reviewedOn})` : ''}</li>)}</ul>
    </details>
  );
}

/** One rounding outcome, labeled with the rule that produced it. */
export function RoundLine({ label, r }: { label: string; r: { amps: number | null; mode: string; rule: string; verify?: string } }) {
  return (
    <div className="mt-1" data-testid="round">
      <p>{label}: <b>{r.amps == null ? '—' : `${r.mode === 'up' ? '' : 'do not exceed '}${r.amps} A`}</b>{r.verify && <VerifyBadge title={r.verify} />}</p>
      <p className="text-xs">{r.mode === 'up' ? '↑ Round up: ' : r.mode === 'down' ? '↓ Round down: ' : ''}{r.rule}</p>
      {r.verify && <p className="text-xs text-orange-700">{r.verify}</p>}
    </div>
  );
}
