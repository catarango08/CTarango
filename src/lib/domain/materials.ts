import { getStore } from '../store';
import type { RecordValue } from '../schema';
import { num, relationIds, round2 } from '../calc';
import { MONEY } from './rules';

/**
 * Materials, the truck, and the line between them.
 *
 * A job line that came off the van has to pull the van count down, or the
 * restock list lies and you find out at the next job.
 */

export interface MaterialTotals {
  cost: number;
  /** What the customer pays: cost plus the markup from the rate card rules. */
  billed: number;
  margin: number;
  lines: number;
  /** Lines that came off the van but have not been decremented yet. */
  unpulled: number;
}

export function lineCost(line: RecordValue): number {
  const extended = num(line.extendedCost);
  return extended > 0 ? extended : round2(num(line.quantity) * num(line.unitCost));
}

export function materialTotals(lines: RecordValue[]): MaterialTotals {
  const billableLines = lines.filter((l) => l.billable !== false);
  const cost = round2(lines.reduce((sum, l) => sum + lineCost(l), 0));
  const billedCost = billableLines.reduce((sum, l) => sum + lineCost(l), 0);
  const billed = round2(billedCost * (1 + MONEY.materialsMarkup));

  return {
    cost,
    billed,
    margin: round2(billed - billedCost),
    lines: lines.length,
    unpulled: lines.filter((l) => String(l.source) === 'Truck stock' && !l.pulledFromTruck).length,
  };
}

/* ------------------------------------------------------------------ *
 * The truck
 * ------------------------------------------------------------------ */

export interface RestockLine {
  item: RecordValue;
  onTruck: number;
  min: number;
  /** How many to buy to get back to twice the minimum — one trip, not two. */
  buy: number;
  cost: number;
  out: boolean;
}

export function restockList(inventory: RecordValue[]): RestockLine[] {
  return inventory
    .filter((item) => num(item.minOnTruck) > 0 && num(item.onTruck) <= num(item.minOnTruck))
    .map((item) => {
      const onTruck = num(item.onTruck);
      const min = num(item.minOnTruck);
      const buy = Math.max(1, Math.ceil(min * 2 - onTruck));
      return { item, onTruck, min, buy, cost: round2(buy * num(item.cost)), out: onTruck <= 0 };
    })
    .sort((a, b) => Number(b.out) - Number(a.out) || a.onTruck / (a.min || 1) - b.onTruck / (b.min || 1));
}

export function truckValue(inventory: RecordValue[]): number {
  return round2(inventory.reduce((sum, i) => sum + num(i.onTruck) * num(i.cost), 0));
}

/**
 * Record a material line against a job, pulling it off the van when it came
 * from truck stock.
 *
 * The decrement and the line are written separately because Notion has no
 * transaction — so the line is created first and only marked `pulledFromTruck`
 * once the van count actually moved. A crash between the two leaves a visible
 * unpulled line rather than a silently wrong truck count.
 */
export async function useMaterial(input: {
  jobId: string;
  itemId?: string;
  name: string;
  quantity: number;
  unitCost?: number;
  source?: string;
  billable?: boolean;
  notes?: string;
}): Promise<RecordValue> {
  const store = getStore();
  const source = input.source ?? (input.itemId ? 'Truck stock' : 'Supply house');

  let unitCost = num(input.unitCost);
  let item: RecordValue | null = null;
  if (input.itemId) {
    item = await store.get('truckInventory', input.itemId);
    if (item && unitCost <= 0) unitCost = num(item.cost);
  }

  const line = await store.create('jobMaterials', {
    name: input.name,
    job: [{ id: input.jobId }],
    ...(input.itemId ? { item: [{ id: input.itemId }] } : {}),
    quantity: input.quantity,
    unitCost,
    extendedCost: round2(input.quantity * unitCost),
    source,
    billable: input.billable ?? true,
    pulledFromTruck: false,
    usedOn: new Date().toISOString().slice(0, 10),
    ...(input.notes ? { notes: input.notes } : {}),
  });

  if (item && source === 'Truck stock') {
    const remaining = round2(num(item.onTruck) - input.quantity);
    await store.update('truckInventory', item.id, { onTruck: remaining });
    return store.update('jobMaterials', line.id, { pulledFromTruck: true });
  }

  return line;
}

/** Put a line back on the van — a mis-entry, or material returned unused. */
export async function returnMaterial(lineId: string): Promise<void> {
  const store = getStore();
  const line = await store.get('jobMaterials', lineId);
  if (!line) return;

  const itemId = relationIds(line.item)[0];
  if (itemId && line.pulledFromTruck) {
    const item = await store.get('truckInventory', itemId);
    if (item) await store.update('truckInventory', itemId, { onTruck: round2(num(item.onTruck) + num(line.quantity)) });
  }
  await store.archive('jobMaterials', lineId);
}

/** Restock the van after a supply run. */
export async function receiveStock(itemId: string, quantity: number): Promise<RecordValue | null> {
  const store = getStore();
  const item = await store.get('truckInventory', itemId);
  if (!item) return null;
  return store.update('truckInventory', itemId, { onTruck: round2(num(item.onTruck) + quantity) });
}
