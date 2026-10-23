import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll, relatedTo } from '@/lib/data';
import { ARRIVAL_PHOTO_STAGES, PHOTO_STAGES, REQUIRED_PHOTO_STAGES } from '@/lib/schema';
import { Card } from '@/components/ui';
import { PhotoStrip } from '@/components/photo-strip';
import { ContactButtons } from '@/components/contact-buttons';
import { InlineEditor } from '@/components/inline-editor';
import { ReviewPrompt } from '@/components/review-prompt';
import { gateTown } from '@/lib/domain/gates';
import { MONEY } from '@/lib/domain/rules';
import { materialTotals } from '@/lib/domain/materials';
import { money, dateTime } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';
import { CLOSE } from '@/config/close';
import { firstName } from '@/lib/domain/pipeline';
import { CUSTOMER_MAIN, CUSTOMER_MORE, JOB_MORE, editFields } from '@/lib/edit-fields';
import { MaterialsPanel } from '../materials-panel';
import { QuickPhoto } from './quick-photo';
import { WorkTimer } from './timer';
import { MessageDrafts } from './messages';
import { NextSteps } from './next-steps';
import { LocationCards } from './location-cards';

export const dynamic = 'force-dynamic';

const BAR: [string, string][] = [
  ['#arrive', 'Arrived'],
  ['#notes', 'Notes'],
  ['#photos', 'Photos'],
  ['#materials', 'Parts'],
  ['#quote', 'Quote'],
  ['#invoice', 'Invoice'],
];

/** What the big button says, by where the job is. One obvious next move. */
function primaryStep(job: Record<string, unknown>, hasQuote: boolean): { href: string; label: string } {
  const s = String(job.status ?? '');
  const id = String(job.id);
  if (!job.arrived) return { href: '#arrive', label: "I'm here — Arrived" };
  if (['On site', 'Booked', 'Scheduled', 'Qualify', 'New call', 'Lead'].includes(s) && !hasQuote) return { href: `/jobs/${id}/quote`, label: 'Build the quote' };
  if (s === 'Quoted') return { href: `/jobs/${id}/quote`, label: 'Get it signed' };
  if (['Approved', 'In Progress', 'Waiting on parts'].includes(s) && !job.doneAt) return { href: '#arrive', label: 'Work timer' };
  if (s !== 'Invoiced' && s !== 'Paid' && s !== 'Closed') return { href: `/jobs/${id}/invoice`, label: 'Invoice it' };
  if (!job.reviewAsked) return { href: '#invoice', label: 'Ask for the review' };
  return { href: `/jobs/${id}`, label: 'Closeout checklist' };
}

/**
 * The on-site job screen. One scroll, a sticky thumb bar at the bottom, every
 * field editable in place and saved through the offline queue. Internal only:
 * it sits behind the passcode, so the street address may appear here.
 */
export default async function OnsitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await findById('jobs', id);
  if (!job) notFound();

  const [photos, territory, materials, stock, quotes] = await Promise.all([
    relatedTo('jobPhotos', 'job', id),
    loadAll('territory'),
    relatedTo('jobMaterials', 'job', id),
    loadAll('truckInventory'),
    relatedTo('quotes', 'job', id),
  ]);
  const customerId = relationIds(job.customer)[0];
  const customer = customerId ? await findById('customers', customerId) : null;

  const verdict = gateTown(String(job.town ?? ''), territory);
  const counts: Record<string, number> = {};
  for (const p of photos) counts[String(p.stage ?? '')] = (counts[String(p.stage ?? '')] ?? 0) + 1;
  const missing = REQUIRED_PHOTO_STAGES.filter((s) => !counts[s]);
  const phone = String(job.phone ?? customer?.phone ?? '');
  const address = String(job.address ?? customer?.address ?? '');
  const totals = materialTotals(materials);
  const latest = [...quotes].sort((a, b) => num(b.version) - num(a.version))[0];
  const step = primaryStep(job, quotes.length > 0);
  const when = job.scheduledAt ? dateTime(new Date(String(job.scheduledAt))) : String(job.window ?? '');
  const reviewLink = CLOSE.googleReviewUrl || CLOSE.googleReviewPlaceholder;
  const first = firstName(customer?.name) || '';

  const jobMain = editFields('jobs', ['status', 'scheduledAt', 'amount', 'town']);
  const notesFields = editFields('jobs', ['notes', 'siteConditions', 'diagnosis', 'workPerformed']);

  return (
    <div className="-mt-4 space-y-4 pb-28">
      {/* Who, where, and the one thing to do next. */}
      <section className="panel p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="label">{[job.jobNumber, job.status, job.town].filter(Boolean).join(' · ')}</p>
            <h1 className="mt-0.5 break-words text-xl font-semibold leading-tight">{customer?.name ? String(customer.name) : String(job.name)}</h1>
            <p className="mt-0.5 break-words text-sm text-[color:var(--ink-muted)]">{String(job.name)}</p>
            {when && <p className="mt-1 text-sm font-medium">🗓 {when}</p>}
          </div>
          <Link href={`/jobs/${id}`} className="btn shrink-0">Ticket</Link>
        </div>
        {verdict.gate !== 'GO' && (
          <div className="mt-3 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-2.5">
            <p className="text-sm font-semibold text-[color:var(--hazard)]">{verdict.gate} — {verdict.town || 'town unknown'}</p>
            <p className="mt-0.5 text-sm">{verdict.instruction}</p>
          </div>
        )}
        <div className="mt-3"><ContactButtons phone={phone} address={address} /></div>
        {address && <p className="mt-2 break-words text-sm text-[color:var(--ink-muted)]">{address}</p>}
        {customer?.accessNotes ? <p className="mt-2 rounded bg-[color:var(--surface-2)] p-2 text-sm">🔑 {String(customer.accessNotes)}</p> : null}
        <a href={step.href} className="btn-primary mt-3 min-h-14 w-full text-lg">{step.label} →</a>
      </section>

      <Card title="Arrive · work timer"><div id="arrive" className="scroll-mt-20" />
        <WorkTimer jobId={id} arrived={job.arrived ? String(job.arrived) : undefined} started={job.startedAt ? String(job.startedAt) : undefined} done={job.doneAt ? String(job.doneAt) : undefined} />
        <div className="mt-3"><InlineEditor db="jobs" id={id} fields={jobMain} values={job} /></div>
      </Card>

      <Card title="Notes"><div id="notes" className="scroll-mt-20" />
        <InlineEditor db="jobs" id={id} fields={notesFields} values={job} more={editFields('jobs', JOB_MORE)} />
      </Card>

      <Card title={`Photos${missing.length ? ` — still need ${missing.join(', ')}` : ''}`}><div id="photos" className="scroll-mt-20" />
        <QuickPhoto jobId={id} stages={[...new Set([...ARRIVAL_PHOTO_STAGES, ...PHOTO_STAGES])].slice(0, 8)} counts={counts} />
        {photos.length > 0 && <div className="mt-3"><PhotoStrip photos={photos} /></div>}
      </Card>

      <Card title={`Parts — ${money(totals.cost)} cost, ${money(totals.billed)} billed`}><div id="materials" className="scroll-mt-20" />
        <MaterialsPanel
          jobId={id}
          markup={MONEY.materialsMarkup}
          lines={materials.map((m) => ({ id: m.id, name: String(m.name ?? ''), quantity: num(m.quantity), unitCost: num(m.unitCost), extendedCost: num(m.extendedCost), source: String(m.source ?? 'Supply house'), billable: m.billable !== false, pulledFromTruck: Boolean(m.pulledFromTruck) }))}
          stock={stock.map((s) => ({ id: s.id, name: String(s.name ?? ''), category: String(s.category ?? 'Other'), onTruck: num(s.onTruck), unit: String(s.unit ?? 'ea'), cost: num(s.cost), bin: String(s.bin ?? '') }))}
        />
      </Card>

      <Card title="Quote · signature · deposit"><div id="quote" className="scroll-mt-20" />
        {latest ? (
          <p className="mb-2 text-base">v{num(latest.version)} · {String(latest.status ?? '')} · {money(num(latest.total))}{latest.signedBy ? ` · signed by ${String(latest.signedBy)}` : ''}</p>
        ) : <p className="mb-2 text-sm text-[color:var(--ink-muted)]">No quote yet.</p>}
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/jobs/${id}/quote`} className="btn-primary min-h-14 text-base">{latest ? 'Open quote' : 'Build quote'}</Link>
          {latest ? <Link href={`/jobs/${id}/quote/${latest.id}`} className="btn min-h-14 justify-center text-base">Customer view</Link> : <span />}
        </div>
      </Card>

      <Card title="Done · invoice · review"><div id="invoice" className="scroll-mt-20" />
        <Link href={`/jobs/${id}/invoice`} className="btn-primary mb-3 min-h-14 w-full text-base">Invoice + pay link</Link>
        <div className="label mb-2">Hand it to the office</div>
        <NextSteps jobId={id} />
        <div className="mt-4">
          <ReviewPrompt jobId={id} phone={phone} text={CLOSE.reviewText.replace('{first}', first || 'there').replace('{link}', reviewLink)} linkMissing={!CLOSE.googleReviewUrl} done={job.reviewAsked === true} />
        </div>
      </Card>

      {customer && (
        <Card title="Customer card — tap any field to edit">
          <InlineEditor db="customers" id={customer.id} fields={editFields('customers', CUSTOMER_MAIN)} values={customer} more={editFields('customers', CUSTOMER_MORE)} />
          <Link href={`/customers/${customer.id}`} className="btn mt-3 w-full justify-center">All jobs for this customer</Link>
        </Card>
      )}

      <LocationCards town={String(job.town ?? '')} address={address} />

      <details className="panel p-4">
        <summary className="flex min-h-12 cursor-pointer items-center font-semibold">Message drafts (confirm, reminder, on my way, thanks)</summary>
        <div className="mt-3"><MessageDrafts first={first} phone={phone} when={when} reviewLink={reviewLink} /></div>
      </details>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[color:var(--line-strong)] bg-[color:var(--surface)] lg:left-60" aria-label="Job sections">
        {BAR.map(([href, label]) => (
          <a key={href} href={href} className="flex min-h-14 items-center justify-center text-[13px] font-semibold active:bg-[color:var(--surface-2)]">{label}</a>
        ))}
      </nav>
    </div>
  );
}
