import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, relatedTo } from '@/lib/data';
import { Card, Chips, Field, MoneyStat, PageHeader, RelationLinks, Stat, StatusPill } from '@/components/ui';
import { PhotoStrip } from '@/components/photo-strip';
import { date, dateTime, money, number, percent, relativeDays, truncate } from '@/lib/format';
import { num } from '@/lib/calc';

export const dynamic = 'force-dynamic';

/** The customer 360: everything you would want on screen when they call. */
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await findById('customers', id);
  if (!customer) notFound();

  const [contacts, properties, jobs, estimates, invoices, interactions, photos, agreements, documents] = await Promise.all([
    relatedTo('contacts', 'customer', id),
    relatedTo('properties', 'customer', id),
    relatedTo('jobs', 'customer', id),
    relatedTo('estimates', 'customer', id),
    relatedTo('invoices', 'customer', id),
    relatedTo('interactions', 'customer', id),
    relatedTo('jobPhotos', 'customer', id),
    relatedTo('agreements', 'customer', id),
    relatedTo('documents', 'customer', id),
  ]);

  const revenue = invoices.filter((i) => String(i.status) !== 'Void').reduce((sum, i) => sum + num(i.total), 0);
  const balance = invoices.reduce((sum, i) => sum + num(i.balanceDue), 0);
  const closedJobs = jobs.filter((j) => ['Closed', 'Invoiced'].includes(String(j.status)));
  const avgMargin = closedJobs.length
    ? closedJobs.reduce((sum, j) => sum + num(j.grossMargin), 0) / closedJobs.length
    : 0;
  const decided = estimates.filter((e) => ['Approved', 'Converted to Job', 'Declined', 'Expired'].includes(String(e.status)));
  const won = decided.filter((e) => ['Approved', 'Converted to Job'].includes(String(e.status)));

  const sortedJobs = [...jobs].sort((a, b) => Date.parse(String(b.scheduledStart ?? 0)) - Date.parse(String(a.scheduledStart ?? 0)));
  const timeline = [...interactions].sort((a, b) => Date.parse(String(b.occurredAt ?? 0)) - Date.parse(String(a.occurredAt ?? 0)));

  return (
    <>
      <PageHeader
        title={String(customer.name)}
        subtitle={[customer.segment, customer.source ? `via ${customer.source}` : null, customer.paymentTerms]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <>
            <StatusPill value={customer.stage} />
            <StatusPill value={customer.rating} />
            <Link href="/records/jobs/new" className="btn-primary">+ Book a job</Link>
          </>
        }
      />

      {customer.creditHold ? (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm">
          <strong>Credit hold.</strong> Do not dispatch until the office clears this account.
        </div>
      ) : null}

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MoneyStat label="Lifetime revenue" amount={revenue || num(customer.lifetimeValue)} />
        <MoneyStat label="Open balance" amount={balance} tone={balance > 0 ? 'warn' : 'good'} />
        <Stat label="Jobs" value={String(jobs.length)} hint={`${closedJobs.length} closed`} />
        <Stat label="Avg. margin" value={percent(avgMargin)} tone={avgMargin >= 0.4 ? 'good' : 'warn'} hint="On closed work" />
        <Stat
          label="Quote win rate"
          value={decided.length ? percent(won.length / decided.length) : '—'}
          hint={`${estimates.length} estimates issued`}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title={`Job history — ${jobs.length}`}>
            {sortedJobs.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">No jobs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[color:var(--line)]">
                      <th className="th">Job</th>
                      <th className="th">Status</th>
                      <th className="th">Scheduled</th>
                      <th className="th">Crew</th>
                      <th className="th text-right">Revenue</th>
                      <th className="th text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--line)]">
                    {sortedJobs.map((job) => (
                      <tr key={job.id}>
                        <td className="td">
                          <Link href={`/jobs/${job.id}`} className="font-medium hover:text-volt-200">{String(job.title)}</Link>
                          <div className="text-xs text-[color:var(--muted)]">{String(job.jobNumber ?? '')}</div>
                        </td>
                        <td className="td"><StatusPill value={job.status} /></td>
                        <td className="td whitespace-nowrap text-[color:var(--muted)]">{date(job.scheduledStart)}</td>
                        <td className="td"><RelationLinks refs={job.assignedTo} max={2} /></td>
                        <td className="td text-right tabular-nums">{money(job.revenue, true)}</td>
                        <td className="td text-right tabular-nums text-[color:var(--muted)]">
                          {job.grossMargin === null ? '—' : percent(job.grossMargin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Conversation history" action={<Link href="/records/interactions/new" className="text-xs text-[color:var(--muted)] hover:text-volt-300">+ Log a touch</Link>}>
            {timeline.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">Nothing logged yet.</p>
            ) : (
              <ol className="relative space-y-3 border-l border-[color:var(--line)] pl-4">
                {timeline.map((item) => (
                  <li key={item.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-volt-400" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{String(item.summary)}</span>
                      <span className="text-xs text-[color:var(--muted)]">{dateTime(item.occurredAt)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Chips values={[item.channel, item.outcome, item.sentiment].filter(Boolean)} max={3} />
                      <RelationLinks refs={item.owner} max={1} />
                    </div>
                    {item.details ? <p className="mt-1 text-sm text-[color:var(--muted)]">{String(item.details)}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title={`Photos on this account — ${photos.length}`} action={<Link href={`/photos?customer=${id}`} className="text-xs text-[color:var(--muted)] hover:text-volt-300">Open library →</Link>}>
            <PhotoStrip photos={photos.slice(0, 8)} />
          </Card>

          <Card title="Money">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="label mb-2">Estimates</div>
                <ul className="space-y-1.5">
                  {estimates.length === 0 && <li className="text-sm text-[color:var(--muted)]">None.</li>}
                  {estimates.map((est) => (
                    <li key={est.id} className="panel-2 flex items-center justify-between gap-2 p-2">
                      <span className="min-w-0 truncate text-sm">{String(est.title)}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <StatusPill value={est.status} />
                        <span className="tabular-nums text-sm">{money(est.total, true)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="label mb-2">Invoices</div>
                <ul className="space-y-1.5">
                  {invoices.length === 0 && <li className="text-sm text-[color:var(--muted)]">None.</li>}
                  {invoices.map((inv) => (
                    <li key={inv.id} className="panel-2 flex items-center justify-between gap-2 p-2">
                      <span className="min-w-0 truncate text-sm">
                        {String(inv.invoiceNumber ?? inv.title)}
                        <span className="ml-1 text-xs text-[color:var(--muted)]">due {date(inv.dueOn)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <StatusPill value={inv.status} />
                        <span className="tabular-nums text-sm">{money(inv.balanceDue || inv.total, true)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Account">
            <div className="space-y-3">
              <Field label="Phone">{String(customer.phone ?? '—')}</Field>
              <Field label="Email">{String(customer.email ?? '—')}</Field>
              <Field label="Billing address">{String(customer.billingAddress ?? '—')}</Field>
              <Field label="Terms">{String(customer.paymentTerms ?? '—')}{customer.taxExempt ? ' · tax exempt' : ''}</Field>
              <Field label="Referred by">{String(customer.referredBy ?? '—')}</Field>
              <Field label="First / last service">
                {date(customer.firstServiceDate)} → {date(customer.lastServiceDate)}
                <span className="ml-1 text-[color:var(--muted)]">{customer.lastServiceDate ? `(${relativeDays(customer.lastServiceDate)})` : ''}</span>
              </Field>
              <Field label="Tags"><Chips values={customer.tags} max={8} /></Field>
              <Field label="Preferred tech"><RelationLinks refs={customer.preferredTech} /></Field>
              {customer.notes ? <Field label="Notes"><span className="text-[color:var(--muted)]">{String(customer.notes)}</span></Field> : null}
            </div>
          </Card>

          <Card title={`Contacts — ${contacts.length}`}>
            <ul className="space-y-2">
              {contacts.length === 0 && <li className="text-sm text-[color:var(--muted)]">No contacts on file.</li>}
              {contacts.map((contact) => (
                <li key={contact.id} className="panel-2 p-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{String(contact.name)}</span>
                    {contact.primary ? <span className="chip border-volt-500/50 text-volt-200">primary</span> : null}
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--muted)]">{String(contact.role ?? '')}</div>
                  <div className="mt-1 text-sm">{String(contact.phone ?? contact.mobile ?? '')}</div>
                  <div className="text-xs text-[color:var(--muted)]">{String(contact.email ?? '')}</div>
                  {contact.preferredChannel ? (
                    <div className="mt-1 text-xs text-[color:var(--muted)]">Prefers: {String(contact.preferredChannel)}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card title={`Service locations — ${properties.length}`}>
            <ul className="space-y-2">
              {properties.length === 0 && <li className="text-sm text-[color:var(--muted)]">No locations on file.</li>}
              {properties.map((property) => (
                <li key={property.id} className="panel-2 p-2.5">
                  <div className="text-sm font-medium">{String(property.name)}</div>
                  <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                    {[property.serviceSize, property.serviceVoltage, property.panelMake].filter(Boolean).join(' · ')}
                  </div>
                  {property.accessNotes ? (
                    <div className="mt-1 text-xs text-[color:var(--muted)]">{truncate(property.accessNotes, 90)}</div>
                  ) : null}
                  <div className="mt-1.5"><Chips values={property.hazards} max={3} /></div>
                </li>
              ))}
            </ul>
          </Card>

          {agreements.length > 0 && (
            <Card title="Service agreements">
              <ul className="space-y-2">
                {agreements.map((agreement) => (
                  <li key={agreement.id} className="panel-2 p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{String(agreement.plan)}</span>
                      <StatusPill value={agreement.status} />
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">
                      {String(agreement.frequency)} · {money(agreement.price, true)} · next {date(agreement.nextServiceDate)}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {documents.length > 0 && (
            <Card title="Documents">
              <ul className="space-y-1.5 text-sm">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-baseline justify-between gap-2">
                    <span>{String(doc.title)}</span>
                    <span className="text-xs text-[color:var(--muted)]">{date(doc.date)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="At a glance">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-[color:var(--muted)]">Photos on file</dt><dd className="tabular-nums">{photos.length}</dd></div>
              <div className="flex justify-between"><dt className="text-[color:var(--muted)]">Touches logged</dt><dd className="tabular-nums">{interactions.length}</dd></div>
              <div className="flex justify-between"><dt className="text-[color:var(--muted)]">Avg. ticket</dt><dd className="tabular-nums">{money(closedJobs.length ? revenue / closedJobs.length : 0, true)}</dd></div>
              <div className="flex justify-between"><dt className="text-[color:var(--muted)]">Total hours worked</dt><dd className="tabular-nums">{number(jobs.reduce((s, j) => s + num(j.actualHours), 0))}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
