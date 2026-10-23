import { NextResponse } from 'next/server';
import { useMaterial } from '@/lib/domain/materials';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

interface Row { description?: string; qty?: number; unitCost?: number; supplier?: string; date?: string }

/**
 * Save every line off a receipt in one go. Supplier, date, and the receipt
 * photo go to their own columns when the Notion DB has them; the supplier is
 * also written into Notes so nothing is lost on an older schema.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { rows?: Row[]; receiptPhotoId?: string; billable?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Expected JSON' }, { status: 400 }); }

  const rows = (body.rows ?? []).filter((r) => r.description?.trim());
  if (!rows.length) return NextResponse.json({ error: 'Add at least one line with a description' }, { status: 422 });
  const bad = rows.find((r) => !(Number(r.qty) > 0));
  if (bad) return NextResponse.json({ error: `“${bad.description}” needs a quantity above zero` }, { status: 422 });

  const store = getStore();
  let receipt: unknown[] | undefined;
  if (body.receiptPhotoId) {
    try { const p = await store.get('jobPhotos', body.receiptPhotoId); if (Array.isArray(p?.file)) {
      // Notion-hosted file URLs expire and uploads attach once, so only copy durable links; the photo itself stays on the job.
      const durable = (p.file as { url?: string }[]).filter((f) => f.url && !/amazonaws|notion\.so|notion-static/.test(f.url));
      if (durable.length) receipt = durable;
    } } catch { /* photo row missing: keep going */ }
  }

  const created = [];
  const failed: { description: string; reason: string }[] = [];
  for (const r of rows) {
    try {
      const supplier = r.supplier?.trim() ?? '';
      const line = await useMaterial({
        jobId: id, name: r.description!.trim(), quantity: Number(r.qty), unitCost: Number(r.unitCost) || 0,
        source: 'Supply house', billable: body.billable ?? true,
        notes: [supplier && `Supplier: ${supplier}`, r.date && `Bought ${r.date}`, body.receiptPhotoId && 'Receipt photo on job'].filter(Boolean).join(' · ') || undefined,
      });
      const extra: Record<string, unknown> = {};
      if (supplier) extra.supplier = supplier;
      if (r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) extra.usedOn = r.date;
      if (receipt) extra.receipt = receipt;
      created.push(Object.keys(extra).length ? await store.update('jobMaterials', line.id, extra) : line);
    } catch (err) {
      failed.push({ description: r.description ?? '', reason: err instanceof Error ? err.message : 'Could not save' });
    }
  }
  return NextResponse.json({ created, failed }, { status: created.length ? (failed.length ? 207 : 201) : 502 });
}
