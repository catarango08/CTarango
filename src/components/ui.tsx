import Link from 'next/link';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { money, percent } from '@/lib/format';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-[color:var(--muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('panel p-4', className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'good' | 'bad' | 'warn' }) {
  const toneClass = {
    default: 'text-[color:var(--text)]',
    good: 'text-emerald-300',
    bad: 'text-rose-300',
    warn: 'text-volt-300',
  }[tone];
  return (
    <div className="panel p-4">
      <div className="label">{label}</div>
      <div className={clsx('mt-1.5 text-2xl font-semibold tabular-nums tracking-tight', toneClass)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[color:var(--muted)]">{hint}</div>}
    </div>
  );
}

export function MoneyStat({ label, amount, hint, tone }: { label: string; amount: number; hint?: string; tone?: 'default' | 'good' | 'bad' | 'warn' }) {
  return <Stat label={label} value={money(amount, true)} hint={hint} tone={tone} />;
}

export function PercentStat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: 'default' | 'good' | 'bad' | 'warn' }) {
  return <Stat label={label} value={percent(value)} hint={hint} tone={tone} />;
}

const STATUS_TONES: Record<string, string> = {
  // jobs
  'Unscheduled': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  'Scheduled': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'Dispatched': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  'On Site': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'In Progress': 'bg-volt-500/15 text-volt-300 border-volt-500/30',
  'Needs Parts': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Awaiting Customer': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Ready to Invoice': 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  'Invoiced': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Closed': 'bg-emerald-600/15 text-emerald-300 border-emerald-600/30',
  'Cancelled': 'bg-slate-600/15 text-slate-400 border-slate-600/30',
  // money
  'Draft': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  'Sent': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'Viewed': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  'Approved': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Partially Paid': 'bg-volt-500/15 text-volt-300 border-volt-500/30',
  'Paid': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Overdue': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'In Collections': 'bg-rose-600/20 text-rose-300 border-rose-600/40',
  'Declined': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'Expired': 'bg-slate-600/15 text-slate-400 border-slate-600/30',
  // priority
  'Emergency': 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  'Same Day': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Urgent': 'bg-volt-500/15 text-volt-300 border-volt-500/30',
  'Standard': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  'Scheduled Maintenance': 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  // permits / safety
  'Corrections Required': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'Failed': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'Passed': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Finaled': 'bg-emerald-600/15 text-emerald-300 border-emerald-600/30',
  'Issued': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'Inspection Scheduled': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  'Not Started': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  'Active': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export function StatusPill({ value, className }: { value: unknown; className?: string }) {
  const label = String(value ?? '').trim();
  if (!label) return <span className="text-[color:var(--muted)]">—</span>;
  const tone = STATUS_TONES[label] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  return (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium', tone, className)}>
      {label}
    </span>
  );
}

export function Chips({ values, max = 4 }: { values: unknown; max?: number }) {
  const list = Array.isArray(values) ? values.map(String).filter(Boolean) : [];
  if (!list.length) return <span className="text-[color:var(--muted)]">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.slice(0, max).map((v) => (
        <span key={v} className="chip">{v}</span>
      ))}
      {list.length > max && <span className="chip">+{list.length - max}</span>}
    </span>
  );
}

export function RelationLinks({ refs, href, max = 3 }: { refs: unknown; href?: (id: string) => string; max?: number }) {
  const list = Array.isArray(refs) ? (refs as { id: string; label?: string }[]) : [];
  if (!list.length) return <span className="text-[color:var(--muted)]">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.slice(0, max).map((ref) =>
        href ? (
          <Link key={ref.id} href={href(ref.id)} className="chip hover:border-volt-500/60 hover:text-volt-200">
            {ref.label || 'Untitled'}
          </Link>
        ) : (
          <span key={ref.id} className="chip">{ref.label || 'Untitled'}</span>
        ),
      )}
      {list.length > max && <span className="chip">+{list.length - max}</span>}
    </span>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-md text-sm text-[color:var(--muted)]">{hint}</p>}
      {action}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="label">{label}</div>
      <div className="mt-1 text-sm">{children ?? '—'}</div>
    </div>
  );
}

export function Bar({ value, max, tone = 'volt' }: { value: number; max: number; tone?: 'volt' | 'rose' | 'emerald' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color = { volt: 'bg-volt-400', rose: 'bg-rose-400', emerald: 'bg-emerald-400' }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--panel-2)]">
      <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
