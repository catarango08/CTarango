import Link from 'next/link';
import { loadAll } from '@/lib/data';
import type { RecordValue } from '@/lib/schema';
import { Card, PageHeader, Stat } from '@/components/ui';
import { QuoteBuilder } from './quote-builder';
import { MONEY, CLOSED_WORK, PROMO } from '@/lib/domain/rules';
import { ZONE_LABELS, pricingFromRateBook, type ZoneNumber } from '@/lib/domain/pricing';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

const BOOK_ORDER = ['Residential flat', 'Labor / dispatch', 'Commercial / critical', 'Agreement'];

export default async function RatesPage({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const { book } = await searchParams;
  const rates = await loadAll('rateBook');
  const pricing = pricingFromRateBook(rates);
  const r = pricing.residential;
  const c = pricing.commercial;
  const shown = book ? rates.filter((r) => String(r.book) === book) : rates;

  return (
    <>
      <PageHeader
        title="Rate book"
        subtitle="The published card. Residential is quoted off the flats — never the hour on the porch."
        actions={<Link href="/jobs" className="btn">Jobs</Link>}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Day trip / diagnostic" value={`$${r.trip.day}`} hint={`Zone 1 + first hour, then $${r.hourly.day}/hr`} />
        <Stat label="Commercial diagnostic" value={`$${c.trip.day}`} hint={`Then $${c.hourly.day}/hr`} />
        <Stat label="Materials" value={`+${MONEY.materialsMarkup * 100}%`} hint="On your cost" />
        <Stat label="Deposit" value={`${MONEY.depositRate * 100}%`} hint={`Over ${money(MONEY.depositThreshold, true)}`} />
      </section>

      <Card title="Quote builder" className="mb-5">
        <QuoteBuilder
          pricing={pricing}
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
        <Card title="Trips and zones (from Elkland)">
          <ul className="space-y-2 text-sm">
            {([1, 2, 3] as ZoneNumber[]).map((z) => (
              <li key={z} className="flex items-baseline justify-between gap-3">
                <span>
                  <span className="font-semibold">Zone {z}</span>
                  <span className="ml-2 text-[color:var(--ink-muted)]">{ZONE_LABELS[z]}</span>
                </span>
                <span className="tabular-nums">${pricing.zones[z]}</span>
              </li>
            ))}
          </ul>
          <table className="mt-3 w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs text-[color:var(--ink-muted)]">
                <th className="font-normal">Trip</th><th className="font-normal">Residential</th><th className="font-normal">Commercial</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Day</td><td>${r.trip.day} · ${r.hourly.day}/hr</td><td>${c.trip.day} · ${c.hourly.day}/hr</td></tr>
              <tr><td>After hours</td><td>${r.trip.afterHours} · ${r.hourly.afterHours}/hr</td><td>${c.trip.afterHours} · ${c.hourly.afterHours}/hr</td></tr>
              <tr><td>Emergency</td><td>${r.trip.emergency} · ${r.hourly.emergency}/hr</td><td>${c.trip.emergency} · ${c.hourly.emergency}/hr</td></tr>
              <tr><td>Holiday</td><td>${r.trip.holiday} · ${r.hourly.holiday}/hr</td><td>${c.trip.holiday} · ${c.hourly.holiday}/hr</td></tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[color:var(--ink-muted)]">
            Every trip includes the Zone 1 trip and the first hour. Zones 2 and 3 add the difference over Zone 1, never multiplied.
            Flats are plus the zone fee. LOTO add-on has no trip fee.
            {pricing.source !== 'notion' && ' Some numbers are fallbacks: a Rate Book row was missing.'}
          </p>
        </Card>

        <Card title="Money rules">
          <ul className="space-y-1.5 text-sm">
            <li>Materials cost + {MONEY.materialsMarkup * 100}%.</li>
            <li>Deposit {MONEY.depositRate * 100}% over {money(MONEY.depositThreshold, true)}.</li>
            <li>Old work +{MONEY.oldWorkSurcharge * 100}% — a known condition, not hidden damage.</li>
            <li>After hours, emergency and holiday change the trip and the hour only. Holiday only if you answer.</li>
            <li>Residential pays at completion. New commercial is due on completion, then Net 15.</li>
          </ul>
          <p className="mt-3 rounded border border-[color:var(--accent)] p-2 text-sm">
            <strong>{PROMO.title}:</strong> {PROMO.text}
          </p>
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
