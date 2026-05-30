import type { Job } from './types';

export function calcBidTotals(job: Job) {
  const labor = job.bid.laborRate * job.bid.laborHours;
  const materialsCost = job.materials.reduce((sum, m) => sum + m.quantity * m.unitCost, 0);
  const materialsWithMarkup = materialsCost * (1 + job.bid.materialMarkup / 100);
  const total = labor + materialsWithMarkup;
  return { labor, materialsCost, materialsWithMarkup, total };
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
