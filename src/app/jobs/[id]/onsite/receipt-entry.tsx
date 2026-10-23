'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { compressImage } from '@/lib/client/image';
import { enqueue } from '@/lib/client/sync';
import { flushPhotos, queuePhoto } from '@/lib/client/upload-queue';
import { parsePasted, parseReceipt, sumCheck, type OcrLine } from '@/lib/receipt-parse';

interface Row { key: number; qty: string; description: string; unitCost: string; supplier: string; date: string; low?: Set<string> }
const LOW = 70;
let seq = 0;
const today = () => new Date().toLocaleDateString('en-CA');
const blank = (supplier = '', date = today()): Row => ({ key: ++seq, qty: '1', description: '', unitCost: '', supplier, date });
const n = (s: string) => Number(String(s).replace(/[$,\s]/g, '')) || 0;
const usd = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/**
 * Parts bought for this job: snap the receipt, let OCR fill the table (or type
 * it / paste it), fix anything flagged, save every line with one tap.
 */
export function ReceiptEntry({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [receipt, setReceipt] = useState<{ file: Blob; url: string } | null>(null);
  const [receiptPhotoId, setReceiptPhotoId] = useState<string>();
  const [ocr, setOcr] = useState<{ state: 'idle' | 'loading' | 'done' | 'failed'; pct?: number; msg?: string }>({ state: 'idle' });
  const [totals, setTotals] = useState<{ subtotal: string; tax: string; total: string; low: Set<string> }>({ subtotal: '', tax: '', total: '', low: new Set() });
  const [paste, setPaste] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [headLow, setHeadLow] = useState<Set<string>>(new Set());
  const lastRow = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { if (receipt) URL.revokeObjectURL(receipt.url); }, [receipt]);

  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => {
    if (r.key !== key) return r;
    const low = new Set(r.low); Object.keys(patch).forEach((k) => low.delete(k));
    return { ...r, ...patch, low };
  }));
  const filled = rows.filter((r) => r.description.trim());
  const itemsTotal = Math.round(filled.reduce((s, r) => s + n(r.qty) * n(r.unitCost), 0) * 100) / 100;
  const check = sumCheck(itemsTotal, { subtotal: totals.subtotal ? n(totals.subtotal) : null, tax: totals.tax ? n(totals.tax) : null, total: totals.total ? n(totals.total) : null });

  async function onReceipt(files: FileList | null) {
    const f = files?.[0]; if (!f) return;
    const small = await compressImage(f, 2000, 0.85);
    setReceipt({ file: small, url: URL.createObjectURL(small) });
    setReceiptPhotoId(undefined);
    void readReceipt(small);
  }

  async function readReceipt(file: Blob) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setOcr({ state: 'failed', msg: 'No signal to load the reader — type the lines in below.' }); return; }
    setOcr({ state: 'loading', pct: 0 });
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, { logger: (m: { status: string; progress: number }) => { if (m.status === 'recognizing text') setOcr({ state: 'loading', pct: Math.round(m.progress * 100) }); } });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const lines: OcrLine[] = (data.lines ?? []).map((l: { text: string; confidence: number }) => ({ text: l.text, confidence: l.confidence }));
      const p = parseReceipt(lines.length ? lines : data.text.split('\n').map((t: string) => ({ text: t, confidence: data.confidence })));
      const hl = new Set<string>();
      if (p.supplier.value) { setSupplier(p.supplier.value); if (p.supplier.confidence < LOW) hl.add('supplier'); } else hl.add('supplier');
      if (p.date.value) { setDate(p.date.value); if (p.date.confidence < LOW) hl.add('date'); } else hl.add('date');
      setHeadLow(hl);
      const tl = new Set<string>();
      (['subtotal', 'tax', 'total'] as const).forEach((k) => { if (p[k].value == null || p[k].confidence < LOW) tl.add(k); });
      setTotals({ subtotal: p.subtotal.value?.toFixed(2) ?? '', tax: p.tax.value?.toFixed(2) ?? '', total: p.total.value?.toFixed(2) ?? '', low: tl });
      if (p.items.length) {
        setRows(p.items.map((i) => ({ key: ++seq, qty: String(i.qty), description: i.description, unitCost: i.unitCost.toFixed(2), supplier: p.supplier.value, date: p.date.value || today(), low: i.confidence < LOW ? new Set(['description', 'qty', 'unitCost']) : new Set() })));
      }
      setOcr({ state: 'done', msg: p.items.length ? `Read ${p.items.length} line${p.items.length === 1 ? '' : 's'} — check anything in orange.` : 'Could not find line items — type them in below.' });
    } catch {
      setOcr({ state: 'failed', msg: 'Reader did not load (no signal?) — type the lines in below.' });
    }
  }

  function applyHeader(next: { supplier?: string; date?: string }) {
    if (next.supplier !== undefined) setSupplier(next.supplier);
    if (next.date !== undefined) setDate(next.date);
    setHeadLow((h) => { const x = new Set(h); Object.keys(next).forEach((k) => x.delete(k)); return x; });
    setRows((rs) => rs.map((r) => ({ ...r, ...(next.supplier !== undefined && (r.supplier === supplier || !r.supplier) ? { supplier: next.supplier } : {}), ...(next.date !== undefined && r.date === date ? { date: next.date } : {}) })));
  }

  function addPasted() {
    const items = parsePasted(paste ?? '');
    if (items.length) setRows((rs) => [...rs.filter((r) => r.description.trim()), ...items.map((i) => ({ key: ++seq, qty: String(i.qty), description: i.description, unitCost: i.unitCost ? i.unitCost.toFixed(2) : '', supplier: i.supplier || supplier, date }))]);
    setPaste(null);
  }

  async function saveAll() {
    if (!filled.length) { setMsg({ ok: false, text: 'Add at least one line.' }); return; }
    setSaving(true); setMsg(null);
    try {
      let photoId = receiptPhotoId;
      if (receipt && !photoId) {
        await queuePhoto({ jobId, stage: 'Receipt', caption: `Receipt${supplier ? ` — ${supplier}` : ''} ${date}`.trim(), name: `receipt-${date}.jpg`, blob: receipt.file });
        await flushPhotos((_q, rec) => { if (rec && _q.stage === 'Receipt') photoId = rec.id; });
        setReceiptPhotoId(photoId);
      }
      const body = { rows: filled.map((r) => ({ description: r.description.trim(), qty: n(r.qty), unitCost: n(r.unitCost), supplier: r.supplier.trim(), date: r.date })), receiptPhotoId: photoId };
      let ok = false;
      try {
        const res = await fetch(`/api/jobs/${jobId}/materials/bulk`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        const data = (await res.json().catch(() => ({}))) as { error?: string; created?: unknown[]; failed?: { description: string; reason: string }[] };
        if (res.status === 422) { setMsg({ ok: false, text: data.error ?? 'Check the lines.' }); return; }
        ok = res.ok;
        if (ok) setMsg({ ok: !data.failed?.length, text: `Saved ${data.created?.length ?? 0} line${data.created?.length === 1 ? '' : 's'}${data.failed?.length ? `, ${data.failed.length} failed: ${data.failed[0].reason}` : ''}.` });
        else throw new Error(data.error);
      } catch {
        enqueue({ url: `/api/jobs/${jobId}/materials/bulk`, method: 'POST', body, key: `receipt-${jobId}-${Date.now()}` });
        setMsg({ ok: true, text: `No signal — ${filled.length} lines saved on this phone and will send when you're back online.` });
        ok = true;
      }
      if (ok) {
        setRows([blank(supplier, date)]); setReceipt(null); setReceiptPhotoId(undefined); setTotals({ subtotal: '', tax: '', total: '', low: new Set() }); setOcr({ state: 'idle' }); setOpen(false);
        router.refresh();
      }
    } finally { setSaving(false); }
  }

  const flag = (low?: Set<string>, k?: string) => (low && k && low.has(k) ? ' ring-2 ring-orange-500 bg-orange-50/10' : '');

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="btn btn-primary min-h-14 w-full text-base">🧾 Add receipt / parts bought</button>;
  }

  return (
    <div className="space-y-3 rounded-lg border border-[color:var(--line)] p-2" data-testid="receipt-entry">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Parts bought</p>
        <button type="button" onClick={() => setOpen(false)} className="btn min-h-12 px-3 text-sm">Close</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="btn min-h-14 cursor-pointer justify-center text-base">📸 Snap receipt
          <input data-testid="receipt-camera" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { void onReceipt(e.target.files); e.target.value = ''; }} />
        </label>
        <label className="btn min-h-14 cursor-pointer justify-center text-base">🖼️ Receipt photo
          <input data-testid="receipt-gallery" type="file" accept="image/*" className="sr-only" onChange={(e) => { void onReceipt(e.target.files); e.target.value = ''; }} />
        </label>
      </div>
      {receipt && (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receipt.url} alt="Receipt" className="h-20 w-16 rounded object-cover" />
          <div className="flex-1 text-sm">
            {ocr.state === 'loading' && <p>Reading receipt… {ocr.pct ?? 0}%</p>}
            {ocr.msg && <p className={ocr.state === 'failed' ? 'text-[color:var(--hazard)]' : ''}>{ocr.msg}</p>}
            {ocr.state !== 'loading' && <button type="button" onClick={() => void readReceipt(receipt.file)} className="btn mt-1 min-h-12 px-3 text-sm">Read again</button>}
          </div>
          <button type="button" aria-label="Remove receipt photo" onClick={() => { setReceipt(null); setOcr({ state: 'idle' }); }} className="btn min-h-12 w-12">✕</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Supplier
          <input className={`input min-h-12 w-full text-base${flag(headLow, 'supplier')}`} value={supplier} onChange={(e) => applyHeader({ supplier: e.target.value })} placeholder="Supply house" />
        </label>
        <label className="text-xs">Date
          <input type="date" className={`input min-h-12 w-full text-base${flag(headLow, 'date')}`} value={date} onChange={(e) => applyHeader({ date: e.target.value })} />
        </label>
      </div>

      <div className="space-y-2" data-testid="receipt-rows">
        {rows.map((r, i) => (
          <div key={r.key} className="rounded border border-[color:var(--line)] p-2">
            <div className="flex gap-2">
              <input aria-label={`Line ${i + 1} quantity`} inputMode="decimal" className={`input min-h-12 w-16 text-base${flag(r.low, 'qty')}`} value={r.qty} onChange={(e) => set(r.key, { qty: e.target.value })} />
              <input ref={i === rows.length - 1 ? lastRow : undefined} aria-label={`Line ${i + 1} description`} placeholder="Description" className={`input min-h-12 flex-1 text-base${flag(r.low, 'description')}`} value={r.description} onChange={(e) => set(r.key, { description: e.target.value })} />
              <button type="button" aria-label={`Remove line ${i + 1}`} onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [blank(supplier, date)]))} className="btn min-h-12 w-12 shrink-0">✕</button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input aria-label={`Line ${i + 1} unit cost`} inputMode="decimal" placeholder="Unit $" className={`input min-h-12 w-24 text-base${flag(r.low, 'unitCost')}`} value={r.unitCost} onChange={(e) => set(r.key, { unitCost: e.target.value })} />
              <input aria-label={`Line ${i + 1} supplier`} placeholder="Supplier" className="input min-h-12 min-w-0 flex-1 text-sm" value={r.supplier} onChange={(e) => set(r.key, { supplier: e.target.value })} />
              <span className="w-16 text-right text-sm tabular-nums">{usd(n(r.qty) * n(r.unitCost))}</span>
            </div>
            <input aria-label={`Line ${i + 1} date`} type="date" className="input mt-2 min-h-12 w-full text-sm" value={r.date} onChange={(e) => set(r.key, { date: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => { setRows((rs) => [...rs, blank(supplier, date)]); setTimeout(() => lastRow.current?.focus(), 0); }} className="btn min-h-12 text-base">+ Add line</button>
        <button type="button" onClick={() => setPaste(paste === null ? '' : null)} className="btn min-h-12 text-base">📋 Paste list</button>
      </div>
      {paste !== null && (
        <div>
          <textarea aria-label="Paste lines" rows={5} className="input w-full text-base" value={paste} onChange={(e) => setPaste(e.target.value)}
            placeholder={'One per line: qty, description, unit cost, supplier\n2, 20A breaker, 9.98\n1 box 1/2" connectors 6.47'} />
          <button type="button" onClick={addPasted} className="btn btn-primary mt-1 min-h-12 w-full">Add these lines</button>
        </div>
      )}

      <div className="rounded bg-[color:var(--surface-2)] p-2 text-sm">
        <div className="grid grid-cols-3 gap-2">
          {(['subtotal', 'tax', 'total'] as const).map((k) => (
            <label key={k} className="text-xs capitalize">{k} (receipt)
              <input inputMode="decimal" className={`input min-h-12 w-full text-base${flag(totals.low, k)}`} value={totals[k]} onChange={(e) => setTotals((t) => { const low = new Set(t.low); low.delete(k); return { ...t, [k]: e.target.value, low }; })} />
            </label>
          ))}
        </div>
        <p className="mt-2" data-testid="sum-check">
          Lines add up to <b>{usd(itemsTotal)}</b>
          {check.ok === true && <span className="text-[color:var(--go)]"> ✓ matches receipt</span>}
          {check.ok === false && <span className="text-[color:var(--hazard)]"> — receipt says {usd(check.target!)} ({check.diff! > 0 ? '+' : ''}{usd(check.diff!)} off)</span>}
        </p>
      </div>

      <button type="button" disabled={saving} onClick={() => void saveAll()} className="btn btn-primary min-h-14 w-full text-base" data-testid="save-receipt">
        {saving ? 'Saving…' : `Save ${filled.length} line${filled.length === 1 ? '' : 's'}`}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? 'text-[color:var(--go)]' : 'text-[color:var(--hazard)]'}`}>{msg.text}</p>}
    </div>
  );
}
