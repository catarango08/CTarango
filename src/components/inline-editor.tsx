'use client';

import { useEffect, useRef, useState } from 'react';
import { clearDraft, loadDraft, patchRecord, saveDraft } from '@/lib/client/sync';

export interface EditField {
  key: string;
  label: string;
  type: string; // schema FieldType
  options?: readonly string[];
  placeholder?: string;
  help?: string;
}

type V = string | number | boolean | string[] | null | undefined;

function toInput(type: string, v: V): string {
  if (v === null || v === undefined) return '';
  if (type === 'datetime' && typeof v === 'string' && v) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (type === 'date' && typeof v === 'string') return v.slice(0, 10);
  return Array.isArray(v) ? v.join(', ') : String(v);
}

function fromInput(type: string, s: string): V {
  if (type === 'number' || type === 'money') return s === '' ? null : Number(s);
  if (type === 'datetime') return s ? new Date(s).toISOString() : null;
  if (type === 'select' || type === 'email' || type === 'url' || type === 'date') return s || null;
  return s;
}

/** Browser speech-to-text, where the phone supports it. Appends to the field. */
function VoiceButton({ onText }: { onText: (t: string) => void }) {
  const [on, setOn] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setOk(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);
  if (!ok) return null;
  function start() {
    const w = window as unknown as Record<string, new () => {
      lang: string; interimResults: boolean; start(): void;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void;
    }>;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    const r = new Rec();
    r.lang = 'en-US';
    r.interimResults = false;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
    r.onend = () => setOn(false);
    setOn(true);
    r.start();
  }
  return (
    <button type="button" className="btn min-h-12 shrink-0" onClick={start} aria-label="Dictate">
      {on ? '● Listening' : '🎤 Talk'}
    </button>
  );
}

function FieldEditor({ db, id, f, initial }: { db: string; id: string; f: EditField; initial: V }) {
  const dkey = `${db}:${id}:${f.key}`;
  const [val, setVal] = useState(() => toInput(f.type, initial));
  const [state, setState] = useState<'' | 'draft' | 'queued'>('');
  const last = useRef(toInput(f.type, initial));

  useEffect(() => {
    const d = loadDraft(dkey);
    if (d !== null && d !== last.current) {
      setVal(d);
      setState('draft');
    }
  }, [dkey]);

  function change(s: string) {
    setVal(s);
    saveDraft(dkey, s);
    setState('draft');
  }
  function commit(s = val) {
    if (s === last.current) {
      clearDraft(dkey);
      setState('');
      return;
    }
    last.current = s;
    patchRecord(db, id, { [f.key]: fromInput(f.type, s) });
    clearDraft(dkey);
    setState('queued');
  }

  const inputMode =
    f.type === 'phone' ? 'tel' : f.type === 'number' || f.type === 'money' ? 'decimal' : f.type === 'email' ? 'email' : undefined;
  const htmlType =
    f.type === 'phone' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'datetime' ? 'datetime-local' : f.type === 'date' ? 'date' : f.type === 'number' || f.type === 'money' ? 'number' : 'text';

  let control: React.ReactNode;
  if (f.type === 'checkbox') {
    const checked = val === 'true';
    control = (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`btn min-h-12 w-full justify-between ${checked ? 'border-[color:var(--go)] text-[color:var(--go)]' : ''}`}
        onClick={() => { const s = String(!checked); setVal(s); commit(s); }}
      >
        <span>{f.label}</span><span className="text-lg">{checked ? '✓ Yes' : 'No'}</span>
      </button>
    );
  } else if (f.type === 'select') {
    control = (
      <select className="input" value={val} onChange={(e) => { setVal(e.target.value); commit(e.target.value); }}>
        <option value="">—</option>
        {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (f.type === 'multi_select') {
    const set = new Set(val ? val.split(',').map((x) => x.trim()).filter(Boolean) : []);
    control = (
      <div className="flex flex-wrap gap-2">
        {f.options?.map((o) => {
          const on = set.has(o);
          return (
            <button key={o} type="button" className={`btn min-h-12 ${on ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/15' : ''}`}
              onClick={() => { const n = new Set(set); if (on) n.delete(o); else n.add(o); const s = [...n].join(', '); setVal(s); last.current = '\u0000'; patchRecord(db, id, { [f.key]: [...n] }); last.current = s; setState('queued'); }}>
              {on ? '✓ ' : ''}{o}
            </button>
          );
        })}
      </div>
    );
  } else if (f.type === 'longtext') {
    control = (
      <div className="space-y-2">
        <textarea className="input min-h-28" rows={4} value={val} placeholder={f.placeholder} onChange={(e) => change(e.target.value)} onBlur={() => commit()} />
        <VoiceButton onText={(t) => { const s = val ? `${val} ${t}` : t; setVal(s); commit(s); }} />
      </div>
    );
  } else {
    control = (
      <input
        className="input"
        type={htmlType}
        inputMode={inputMode}
        step={f.type === 'money' ? '0.01' : undefined}
        value={val}
        placeholder={f.placeholder}
        autoComplete="off"
        onChange={(e) => change(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
    );
  }

  return (
    <label className="block">
      {f.type !== 'checkbox' && (
        <span className="mb-1 flex items-baseline justify-between gap-2">
          <span className="label">{f.label}</span>
          <span className="text-xs text-[color:var(--ink-muted)]">{state === 'draft' ? 'Draft kept on phone' : state === 'queued' ? 'Saved' : ''}</span>
        </span>
      )}
      {control}
    </label>
  );
}

/**
 * Tap a field, change it, tap away. Each field writes back to Notion on its
 * own through the offline queue. Drafts live in localStorage until they land.
 */
export function InlineEditor({ db, id, fields, values, more }: { db: string; id: string; fields: EditField[]; values: Record<string, unknown>; more?: EditField[] }) {
  return (
    <div className="space-y-3">
      {fields.map((f) => <FieldEditor key={f.key} db={db} id={id} f={f} initial={values[f.key] as V} />)}
      {more && more.length > 0 && (
        <details className="panel-2 p-3">
          <summary className="flex min-h-12 cursor-pointer items-center font-medium">More fields ({more.length})</summary>
          <div className="mt-3 space-y-3">
            {more.map((f) => <FieldEditor key={f.key} db={db} id={id} f={f} initial={values[f.key] as V} />)}
          </div>
        </details>
      )}
    </div>
  );
}
