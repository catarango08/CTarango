import { loadAll } from '@/lib/data';
import { PageHeader, Card } from '@/components/ui';
import { NewCallForm } from './new-call-form';
import { BUSINESS, MONEY } from '@/lib/domain/rules';

export const dynamic = 'force-dynamic';

export default async function NewCallPage() {
  const [territory, customers] = await Promise.all([loadAll('territory'), loadAll('customers')]);

  return (
    <>
      <PageHeader
        title="New call"
        subtitle="Town first. Everything else waits."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <NewCallForm
          territory={territory.map((t) => ({
            id: t.id,
            name: String(t.name ?? ''),
            status: String(t.status ?? ''),
            licenseNote: String(t.licenseNote ?? ''),
            schedule: String(t.schedule ?? ''),
          }))}
          customers={customers.map((c) => ({
            id: c.id,
            name: String(c.name ?? ''),
            phone: String(c.phone ?? ''),
            town: String(c.town ?? ''),
          }))}
        />

        <div className="space-y-4">
          <Card title="The script">
            <p className="font-serif text-sm leading-relaxed">
              “{BUSINESS.name}. This is Corey. What town are you in, and what’s dead?”
            </p>
            <p className="mt-3 text-sm text-[color:var(--ink-muted)]">
              Name, town, what is dead, when they need you. In that order. The town decides whether
              there is a quote to give.
            </p>
          </Card>

          <Card title="What it costs them">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Residential diagnostic</dt>
                <dd className="tabular-nums font-semibold">${MONEY.residentialDiagnostic}</dd>
              </div>
              <p className="text-xs text-[color:var(--ink-muted)]">
                First hour, credited if we repair the same visit.
              </p>
              <div className="flex justify-between gap-3 border-t border-[color:var(--line)] pt-2">
                <dt>Commercial diagnostic</dt>
                <dd className="tabular-nums font-semibold">${MONEY.commercialDiagnostic}</dd>
              </div>
              <p className="text-xs text-[color:var(--ink-muted)]">
                First hour, then ${MONEY.commercialHourly}/hr.
              </p>
            </dl>
            <p className="mt-3 border-t border-[color:var(--line)] pt-2 text-xs text-[color:var(--ink-muted)]">
              Residential is quoted off the flat card once you are on site. Never quote the hour on
              the porch.
            </p>
          </Card>

          <Card title="If it is a red town">
            <p className="text-sm">
              Be polite and be brief. Do not quote, do not price it “just so they know,” and do not
              promise to call when things change.
            </p>
            <p className="mt-2 font-serif text-sm italic text-[color:var(--ink-muted)]">
              “I can’t take work in {'{town}'} yet. I stay in {BUSINESS.advertisedTowns.join(', ')} and
              the county roads around them.”
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
