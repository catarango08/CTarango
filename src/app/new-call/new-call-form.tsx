'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { gateTown } from '@/lib/domain/gates';
import { JOB_TOWNS, JOB_TYPES, LEAD_SOURCES } from '@/lib/schema';
import type { RecordValue } from '@/lib/schema';

interface TownRow { id: string; name: string; status: string; licenseNote: string; schedule: string }
interface CustomerRow { id: string; name: string; phone: string; town: string }

/**
 * Intake, in the order the phone script asks for it.
 *
 * The town is answered first and gates everything after it: a red or unmatched
 * town never reaches the booking step, and the only thing the form will write
 * for one is a No-go ticket. That is the rule the OS states — "Town first. Red
 * or unknown → Status No-go" — enforced here rather than left to memory.
 */
export function NewCallForm({ territory, customers }: { territory: TownRow[]; customers: CustomerRow[] }) {
  const router = useRouter();
  const [town, setTown] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [problem, setProblem] = useState('');
  const [type, setType] = useState<string>('Residential');
  const [source, setSource] = useState<string>('Phone');
  const [window, setWindow] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () => territory.map((t) => ({ ...t, status: t.status }) as unknown as RecordValue),
    [territory],
  );
  const verdict = useMemo(() => gateTown(town, rows), [town, rows]);

  const existing = useMemo(() => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) return null;
    return customers.find((c) => c.phone.replace(/\D/g, '').endsWith(digits.slice(-7))) ?? null;
  }, [phone, customers]);

  const gateKnown = town.trim().length > 0;
  const canBook = gateKnown && verdict.gate === 'GO';
  const canQualify = gateKnown && verdict.gate === 'VERIFY';

  /** Maps a free-typed town onto the Jobs.Town select, which only carries green towns. */
  function townSelectValue(): string {
    const match = JOB_TOWNS.find((t) => t.toLowerCase() === verdict.town.toLowerCase());
    if (match) return match;
    const loose = JOB_TOWNS.find(
      (t) => t !== 'Other — STOP' && verdict.town.toLowerCase().startsWith(t.toLowerCase().replace(' co', '')),
    );
    return loose ?? 'Other — STOP';
  }

  /**
   * Create the card right now and go finish it on the ticket.
   *
   * The phone is still to his ear and the details are still coming. Waiting
   * until the form is complete loses calls, so this writes what exists and
   * gets out of the way — no template to duplicate, no blank row to find later.
   */
  async function startCardNow() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/records/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || (town.trim() ? `New call — ${town.trim()}` : 'New call'),
          status: 'New call',
          type,
          source,
          town: townSelectValue(),
          phone: phone.trim(),
          notes: problem.trim(),
          nextAction: 'Finish the intake. Ask town, what is dead, and when they need you.',
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { record?: { id: string }; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Could not start the card');
      router.push(body.record?.id ? `/jobs/${body.record.id}` : '/jobs');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the card');
      setBusy(false);
    }
  }

  async function submit(intent: 'book' | 'qualify' | 'nogo') {
    setBusy(true);
    setError(null);

    const status = intent === 'book' ? 'Booked' : intent === 'qualify' ? 'Qualify' : 'No-go';
    const nextAction =
      intent === 'book'
        ? `Text them the window. Diagnostic $${type === 'Commercial' || type === 'Standby / Critical' ? 149 : 119}.`
        : intent === 'qualify'
          ? `Call the AHJ in ${verdict.town} before quoting.`
          : 'Stop. Declined politely — outside the footprint until licensed.';

    try {
      let customerId = existing?.id ?? null;
      if (!customerId && name.trim()) {
        const res = await fetch('/api/records/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            town: verdict.town || town.trim(),
            kind: type === 'Commercial' ? 'Commercial' : type === 'Farm / Shop' ? 'Farm' : 'Homeowner',
            stage: intent === 'nogo' ? 'Do not serve' : 'New',
            foundUs: source,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as { record?: { id: string }; error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Could not save the customer');
        customerId = body.record?.id ?? null;
      }

      const jobRes = await fetch('/api/records/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${name.trim() || 'New call'} — ${problem.trim() || 'what is dead'}`,
          status,
          type,
          source,
          town: townSelectValue(),
          phone: phone.trim(),
          window: window.trim(),
          notes: [problem.trim(), verdict.licenseNote ? `Town note: ${verdict.licenseNote}` : '']
            .filter(Boolean)
            .join('\n'),
          nextAction,
          ...(customerId ? { customer: [{ id: customerId }] } : {}),
        }),
      });
      const jobBody = (await jobRes.json().catch(() => ({}))) as { record?: { id: string }; error?: string };
      if (!jobRes.ok) throw new Error(jobBody.error ?? 'Could not save the ticket');

      router.push(jobBody.record?.id ? `/jobs/${jobBody.record.id}` : '/jobs');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Straight to a card. The gated path below is the considered version;
          this is for when the phone is already ringing. */}
      <section className="panel flex flex-wrap items-center justify-between gap-3 p-3">
        <span className="text-sm text-[color:var(--ink-muted)]">
          Phone in your hand? Start the card now and finish it on the ticket.
        </span>
        <button type="button" className="btn min-h-11" disabled={busy} onClick={() => void startCardNow()}>
          {busy ? 'Starting…' : 'Start a card now'}
        </button>
      </section>

      {/* Step one: the town. */}
      <section className="panel p-4">
        <div className="label">Step one</div>
        <h2 className="display mt-0.5 text-xl">What town are you in?</h2>
        <input
          className="input mt-3 text-lg"
          value={town}
          onChange={(e) => setTown(e.target.value)}
          placeholder="Bolivar"
          autoFocus
          autoComplete="off"
        />

        {gateKnown && (
          <div
            className={`mt-3 rounded border p-3 ${
              verdict.gate === 'GO'
                ? 'border-[color:var(--go)] bg-[color:var(--go-bg)]'
                : verdict.gate === 'VERIFY'
                  ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10'
                  : 'border-[color:var(--hazard)] bg-[color:var(--hazard-bg)]'
            }`}
          >
            <div
              className={`display text-2xl ${
                verdict.gate === 'GO'
                  ? 'text-[color:var(--go)]'
                  : verdict.gate === 'VERIFY'
                    ? 'text-[color:var(--accent-ink)]'
                    : 'text-[color:var(--hazard)]'
              }`}
            >
              {verdict.gate}
            </div>
            <p className="mt-1 text-sm font-medium">{verdict.instruction}</p>
            {verdict.licenseNote && (
              <p className="mt-1 text-sm text-[color:var(--ink-muted)]">{verdict.licenseNote}</p>
            )}
          </div>
        )}
      </section>

      {/* Step two: who and what. Open regardless of gate — a No-go still gets logged. */}
      {gateKnown && (
        <section className="panel p-4">
          <div className="label">Step two</div>
          <h2 className="display mt-0.5 text-xl">Who is calling, and what is dead?</h2>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Name</span>
              <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dale Hollis" />
            </label>
            <label className="block">
              <span className="label">Phone</span>
              <input className="input mt-1" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="417-555-0142" />
              {existing && (
                <span className="mt-1 block text-xs text-[color:var(--go)]">
                  Called before — {existing.name}. The ticket will attach to them.
                </span>
              )}
            </label>
            <label className="block sm:col-span-2">
              <span className="label">What is dead</span>
              <textarea
                className="input mt-1 min-h-20"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Well pump quit. No power at the pressure switch."
              />
            </label>
            <label className="block">
              <span className="label">Type</span>
              <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value)}>
                {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">How they found us</span>
              <select className="input mt-1" value={source} onChange={(e) => setSource(e.target.value)}>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {canBook && (
              <label className="block sm:col-span-2">
                <span className="label">Window you promised</span>
                <input className="input mt-1" value={window} onChange={(e) => setWindow(e.target.value)} placeholder="Thursday 8–10 AM" />
              </label>
            )}
          </div>
        </section>
      )}

      {/* Step three: the only action the gate allows. */}
      {gateKnown && (
        <section className="panel p-4">
          <div className="label">Step three</div>
          {canBook ? (
            <>
              <h2 className="display mt-0.5 text-xl">Book the diagnostic</h2>
              <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                Green town. Put the window on the card and text it to them.
              </p>
              <button type="button" className="btn-primary mt-3 min-h-11 w-full justify-center" disabled={busy} onClick={() => submit('book')}>
                {busy ? 'Saving…' : 'Book it'}
              </button>
            </>
          ) : canQualify ? (
            <>
              <h2 className="display mt-0.5 text-xl">Qualify it first</h2>
              <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                Amber town. The ticket opens at Qualify with “call the AHJ” as the next action. No
                quote until they answer.
              </p>
              <button type="button" className="btn-primary mt-3 min-h-11 w-full justify-center" disabled={busy} onClick={() => submit('qualify')}>
                {busy ? 'Saving…' : 'Log it as Qualify'}
              </button>
            </>
          ) : (
            <>
              <h2 className="display mt-0.5 text-xl text-[color:var(--hazard)]">Do not quote this one</h2>
              <p className="mt-1 text-sm">
                {verdict.gate === 'UNKNOWN'
                  ? 'That town is not on the territory list. Treat it as closed until the clerk says otherwise.'
                  : 'Red town. Be polite, be brief, and do not price it.'}
              </p>
              <button type="button" className="btn-hazard mt-3 min-h-11 w-full justify-center" disabled={busy} onClick={() => submit('nogo')}>
                {busy ? 'Saving…' : 'Log it as No-go'}
              </button>
            </>
          )}
          {error && <p className="mt-2 text-sm text-[color:var(--hazard)]">{error}</p>}
        </section>
      )}
    </div>
  );
}
