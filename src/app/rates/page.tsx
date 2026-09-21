import Link from 'next/link';
import { loadAll } from '@/lib/data';
import type { RecordValue } from '@/lib/schema';
import { Card, PageHeader, Stat } from '@/components/ui';
import { QuoteBuilder } from './quote-builder';
import { MONEY, TRAVEL_ZONES, CLOSED_WORK } from '@/lib/domain/rules';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

const BOOK_ORDER = ['Residential flat', 'Labor / dispatch', 'Commercial / critical', 'Agreement'];

export default async function RatesPage({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const { book } = await searchParams;
  const rates = await loadAll('rateBook');
  const shown = book ? rates.filter((r) => String(r.book) === book) : rates;

  return (
    <>
      <PageHeader
        title="Rate book"
        subtitle="The published card. Residential is quoted off the flats — never the hour on the porch."
        actions={<Link href="/jobs" className="btn">Jobs</Link>}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Residential diagnostic" value={`$${MONEY.residentialDiagnostic}`} hint="Credited if repaired same visit" />
        <Stat label="Commercial" value={`$${MONEY.commercialDiagnostic}`} hint={`Then $${MONEY.commercialHourly}/hr`} />
        <Stat label="Materials" value={`+${MONEY.materialsMarkup * 100}%`} hint="On your cost" />
        <Stat label="Deposit" value={`${MONEY.depositRate * 100}%`} hint={`Over ${money(MONEY.depositThreshold, true)}`} />
      </section>

      <Card title="Quote builder" className="mb-5">
        <QuoteBuilder
          rates={rates
            .filter((r) => r.active !== false)
            .map((r) => ({
              id: r.id,
              name: String(r.name ?? ''),
              book: String(r.book ?? ''),
              price: Number(r.price ?? 0),
              assumes: String(r.assumes ?? ''),
            }))}
        />
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="label mr-1">Book</span>
        <Link href="/rates" className={`chip min-h-8 ${!book ? 'border-[color:var(--accent)] text-[color:var(--accent-ink)]' : ''}`}>All</Link>
        {BOOK_ORDER.map((b) => (
          <Link
            key={b}
            href={`/rates?book=${encodeURIComponent(b)}`}
            className={`chip min-h-8 ${book === b ? 'border-[color:var(--accent)] text-[color:var(--accent-ink)]' : ''}`}
          >
            {b}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {BOOK_ORDER.filter((b) => shown.some((r) => String(r.book) === b)).map((b) => (
          <Card key={b} title={b}>
            <ul className="divide-y divide-[color:var(--line)]">
              {shown
                .filter((r) => String(r.book) === b)
                .sort((x, y) => String(x.name).localeCompare(String(y.name)))
                .map((rate) => <RateRow key={rate.id} rate={rate} />)}
            </ul>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Travel">
          <ul className="space-y-2 text-sm">
            {TRAVEL_ZONES.map((zone) => (
              <li key={zone.zone} className="flex items-baseline justify-between gap-3">
                <span>
                  <span className="font-semibold">Zone {zone.zone}</span>
                  <span className="ml-2 text-[color:var(--ink-muted)]">{zone.label}</span>
                </span>
                <span className="tabular-nums">{zone.fee === 0 ? zone.note : `$${zone.fee}`}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Money rules">
          <ul className="space-y-1.5 text-sm">
            <li>Materials cost + {MONEY.materialsMarkup * 100}%.</li>
            <li>Deposit {MONEY.depositRate * 100}% over {money(MONEY.depositThreshold, true)}.</li>
            <li>Old work +{MONEY.oldWorkSurcharge * 100}% — a known condition, not hidden damage.</li>
            <li>After hours {MONEY.afterHoursMultiplier}×. Holiday {MONEY.holidayMultiplier}× only if you answer.</li>
            <li>Residential pays at completion. New commercial is due on completion, then Net 15.</li>
          </ul>
          {CLOSED_WORK.map((closed) => (
            <p key={closed.work} className="mt-3 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-2 text-sm">
              <strong className="text-[color:var(--hazard)]">{closed.work} are closed</strong> until {closed.until}. {closed.stillOpen}
            </p>
          ))}
        </Card>
      </div>
    </>
  );
}

function RateRow({ rate }: { rate: RecordValue }) {
  const withdrawn = rate.active === false;
  return (
    <li className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 ${withdrawn ? 'opacity-50' : ''}`}>
      <span className="min-w-0 flex-1">
        <span className="text-sm font-medium">{String(rate.name)}</span>
        {/* Assumes is the scope the price depends on — he reads it out loud, so it is not a footnote. */}
        {rate.assumes ? (
          <span className="mt-0.5 block text-xs text-[color:var(--ink-muted)]">{String(rate.assumes)}</span>
        ) : null}
      </span>
      <span className="shrink-0 tabular-nums text-base font-semibold">
        {withdrawn ? 'withdrawn' : money(rate.price)}
      </span>
    </li>
  );
}
