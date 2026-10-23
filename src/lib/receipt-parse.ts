/**
 * Turn OCR text from a supply-house receipt into editable fields. Pure and
 * heuristic: every field carries a confidence so the screen can flag the
 * shaky ones, and the line items get a sum check against the subtotal/total.
 */
export interface OcrWord { text: string; confidence: number }
export interface OcrLine { text: string; confidence: number }
export interface ParsedLine { description: string; qty: number; unitCost: number; amount: number; confidence: number }
export interface ParsedReceipt {
  supplier: { value: string; confidence: number };
  date: { value: string; confidence: number };
  items: ParsedLine[];
  subtotal: { value: number | null; confidence: number };
  tax: { value: number | null; confidence: number };
  total: { value: number | null; confidence: number };
}

const MONEY = /\$?\s*(-?\d{1,5}(?:,\d{3})*[.,]\d{2})\s*[A-Z]?$/;
const SKIP = /\b(subtotal|sub total|sub-total|tax|total|balance|change|cash|visa|master|amex|debit|credit|card|tender|auth|approval|thank|items? sold|discount|savings|ref|tran|store\s*#|cashier|register)\b/i;
const KNOWN = ['Home Depot', "Lowe's", 'Lowes', 'Graybar', 'Rexel', 'CED', 'Crescent', 'Menards', 'Ace Hardware', 'Platt', 'Border States', 'Mayer', 'Wesco', 'Elliott Electric', 'Walmart', 'Harbor Freight', 'Grainger'];

const money = (s: string) => Number(s.replace(/[$\s,](?=\d{3}\b)/g, '').replace(/,(\d{2})$/, '.$1').replace(/[$\s,]/g, ''));
const r2 = (n: number) => Math.round(n * 100) / 100;

function findDate(text: string): string {
  const m = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/) ?? null;
  if (m) {
    let y = Number(m[3]); if (y < 100) y += 2000;
    const mo = Number(m[1]), d = Number(m[2]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  return iso ? iso[0] : '';
}

export function parseReceipt(lines: OcrLine[]): ParsedReceipt {
  const clean = lines.map((l) => ({ text: l.text.replace(/\s+/g, ' ').trim(), confidence: l.confidence })).filter((l) => l.text);
  const all = clean.map((l) => l.text).join('\n');

  // Supplier: a known name anywhere, else the first wordy line at the top.
  let supplier = { value: '', confidence: 0 };
  const known = KNOWN.find((k) => all.toLowerCase().includes(k.toLowerCase().replace("'", '')) || all.toLowerCase().includes(k.toLowerCase()));
  if (known) {
    const line = clean.slice(0, 5).find((l) => l.text.toLowerCase().includes(known.toLowerCase()));
    const full = line && line.text.length <= 40 ? line.text.replace(/[^A-Za-z0-9&'. -]/g, '').trim() : known;
    supplier = { value: (known === 'Lowes' ? "Lowe's" : full).replace(/\b([A-Z])([A-Z']+)\b/g, (_m, a, b) => a + b.toLowerCase()), confidence: 90 };
  }
  else {
    const top = clean.slice(0, 4).find((l) => /[A-Za-z]{3,}/.test(l.text) && !MONEY.test(l.text) && !/\d{3}[-) ]\d{3}/.test(l.text));
    if (top) supplier = { value: top.text.replace(/[^A-Za-z0-9&'. -]/g, '').trim(), confidence: Math.min(70, top.confidence) };
  }

  const dateLine = clean.find((l) => findDate(l.text));
  const date = dateLine ? { value: findDate(dateLine.text), confidence: dateLine.confidence } : { value: '', confidence: 0 };

  const pick = (re: RegExp) => {
    const l = [...clean].reverse().find((x) => re.test(x.text) && MONEY.test(x.text));
    return l ? { value: money(l.text.match(MONEY)![1]), confidence: l.confidence } : { value: null, confidence: 0 };
  };
  const subtotal = pick(/sub\s*-?\s*total/i);
  const tax = pick(/\btax\b/i);
  let total = pick(/^(?!.*sub).*\b(total|balance due|amount due)\b/i);
  // A smudged decimal ("TOTAL 136551") reads as no money at all: fall back to subtotal + tax, flagged.
  if (total.value == null && subtotal.value != null) total = { value: r2(subtotal.value + (tax.value ?? 0)), confidence: 50 };

  const items: ParsedLine[] = [];
  for (const l of clean) {
    const m = l.text.match(MONEY);
    if (!m || SKIP.test(l.text)) continue;
    const amount = money(m[1]);
    let rest = l.text.slice(0, m.index).trim();
    let qty = 1, unitCost = amount;
    // "2 @ 4.98", "2 x 4.98", "2 EA 4.98", or a leading quantity "3 WIRE NUT"
    const at = rest.match(/(\d+(?:\.\d+)?)\s*(?:@|x|ea\b|EA\b)\s*\$?(\d+[.,]\d{2})\s*$/i)
      ?? rest.match(/^(\d+(?:\.\d+)?)\s*(?:@|x)\s*\$?(\d+[.,]\d{2})\s+/i);
    if (at) { qty = Number(at[1]); unitCost = money(at[2]); rest = at.index === 0 ? rest.slice(at[0].length).trim() : rest.slice(0, at.index).trim(); }
    else {
      const lead = rest.match(/^(\d{1,3})\s+(?=[A-Za-z])/);
      if (lead && Number(lead[1]) > 0 && Number(lead[1]) < 500) { qty = Number(lead[1]); unitCost = r2(amount / qty); rest = rest.slice(lead[0].length); }
    }
    rest = rest.replace(/^\d{6,}\s*/, '').replace(/\s+\d{6,}$/, '').replace(/[|_~]+/g, '').trim();
    if (!/[A-Za-z]{2,}/.test(rest)) continue;
    let confidence = l.confidence;
    if (at && Math.abs(qty * unitCost - amount) > 0.02) confidence = Math.min(confidence, 40);
    items.push({ description: rest, qty, unitCost: r2(unitCost), amount: r2(amount), confidence });
  }

  return { supplier, date, items, subtotal, tax, total };
}

/** Does the line-item sum agree with the receipt? Returns the difference against the subtotal (or total − tax). */
export function sumCheck(itemsTotal: number, r: { subtotal: number | null; tax: number | null; total: number | null }) {
  const target = r.subtotal ?? (r.total != null ? r.total - (r.tax ?? 0) : null);
  if (target == null) return { target: null, diff: null, ok: null as boolean | null };
  const diff = r2(itemsTotal - target);
  return { target: r2(target), diff, ok: Math.abs(diff) <= 0.02 };
}

/** Pasted bulk entry: one item per line, "qty, description, unit cost, supplier" — tabs, commas, or "2 x wire nuts 4.98". */
export function parsePasted(text: string): { qty: number; description: string; unitCost: number; supplier: string }[] {
  return text.split(/\r?\n/).map((raw) => raw.trim()).filter(Boolean).map((raw) => {
    const parts = raw.includes('\t') ? raw.split('\t') : raw.split(/\s*,\s*/);
    if (parts.length >= 3 && /^\d+(\.\d+)?$/.test(parts[0].trim())) {
      return { qty: Number(parts[0]), description: parts[1].trim(), unitCost: money(parts[2].replace(/[^\d.,-]/g, '') || '0') || 0, supplier: (parts[3] ?? '').trim() };
    }
    const m = raw.match(/^(?:(\d+(?:\.\d+)?)\s*(?:x|@)?\s+)?(.+?)\s+\$?(\d+(?:\.\d{1,2})?)$/i);
    if (m) return { qty: Number(m[1] ?? 1), description: m[2].trim(), unitCost: Number(m[3]), supplier: '' };
    return { qty: 1, description: raw, unitCost: 0, supplier: '' };
  });
}
