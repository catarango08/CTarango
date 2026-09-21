import Link from 'next/link';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { money, percent } from '@/lib/format';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-[color:var(--ink-muted)]">{subtitle}</p>}
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
    default: 'text-[color:var(--ink)]',
    good: 'text-[color:var(--go)]',
    bad: 'text-[color:var(--hazard)]',
    warn: 'text-[color:var(--accent-ink)]',
  }[tone];
  return (
    <div className="panel p-4">
      <div className="label">{label}</div>
      <div className={clsx('mt-1.5 text-2xl font-semibold tabular-nums tracking-tight', toneClass)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[color:var(--ink-muted)]">{hint}</div>}
    </div>
  );
}

export function MoneyStat({ label, amount, hint, tone }: { label: string; amount: number; hint?: string; tone?: 'default' | 'good' | 'bad' | 'warn' }) {
  return <Stat label={label} value={money(amount, true)} hint={hint} tone={tone} />;
}

export function PercentStat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: 'default' | 'good' | 'bad' | 'warn' }) {
  return <Stat label={label} value={percent(value)} hint={hint} tone={tone} />;
}

/**
 * Brand-locked tones. Oxide Red is reserved by the kit for tagline and hazard,
 * so it marks exactly that: NO-GO towns, hazards, overdue money, failed
 * inspections. Everything else is charcoal, gold or the field green.
 */
const TONE_CLASSES = {
  neutral: 'border-[color:var(--line-strong)] bg-[color:var(--surface-2)] text-[color:var(--ink-muted)]',
  active: 'border-[color:var(--accent)] bg-[color:var(--accent)]/12 text-[color:var(--accent-ink)]',
  done: 'border-[color:var(--go)] bg-[color:var(--go-bg)] text-[color:var(--go)]',
  hazard: 'border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] text-[color:var(--hazard)]',
} as const;

export type Tone = keyof typeof TONE_CLASSES;

const STATUS_TONES: Record<string, Tone> = {
  // Territory gate
  'GO': 'done',
  'VERIFY': 'active',
  'NO-GO': 'hazard',
  // Money
  'Paid': 'done',
  'Sent': 'active',
  'Draft': 'neutral',
  'Overdue': 'hazard',
  'Declined': 'hazard',
  'Approved': 'done',
  // Inspection
  'Passed': 'done',
  'Failed': 'hazard',
  'Corrections Required': 'hazard',
};

export function toneFor(value: string): Tone {
  if (STATUS_TONES[value]) return STATUS_TONES[value];
  const v = value.toLowerCase();
  if (/(closed|paid|passed|complete|done|go\b)/.test(v)) return 'done';
  if (/(no-go|hazard|overdue|failed|declined|danger|red)/.test(v)) return 'hazard';
  if (/(progress|site|dispatch|scheduled|active|verify|open|quoted|sent)/.test(v)) return 'active';
  return 'neutral';
}

export function StatusPill({ value, className, tone }: { value: unknown; className?: string; tone?: Tone }) {
  const label = String(value ?? '').trim();
  if (!label) return <span className="text-[color:var(--ink-muted)]">—</span>;
  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone ?? toneFor(label)],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function Chips({ values, max = 4 }: { values: unknown; max?: number }) {
  const list = Array.isArray(values) ? values.map(String).filter(Boolean) : [];
  if (!list.length) return <span className="text-[color:var(--ink-muted)]">—</span>;
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
  if (!list.length) return <span className="text-[color:var(--ink-muted)]">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.slice(0, max).map((ref) =>
        href ? (
          <Link key={ref.id} href={href(ref.id)} className="chip hover:border-volt-500/60 hover:text-[color:var(--accent-ink)]">
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
      {hint && <p className="max-w-md text-sm text-[color:var(--ink-muted)]">{hint}</p>}
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

export function Bar({ value, max, tone = 'accent' }: { value: number; max: number; tone?: 'accent' | 'hazard' | 'go' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color = { accent: 'bg-[color:var(--accent)]', hazard: 'bg-[color:var(--hazard)]', go: 'bg-[color:var(--go)]' }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
      <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
