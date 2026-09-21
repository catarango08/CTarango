'use client';

import { useMemo, useState } from 'react';
import { gateTown } from '@/lib/domain/gates';
import type { RecordValue } from '@/lib/schema';

const GATE_COLOR: Record<string, string> = {
  GO: 'var(--go)',
  VERIFY: 'var(--accent-ink)',
  'NO-GO': 'var(--hazard)',
  UNKNOWN: 'var(--hazard)',
};

/** He runs this with a customer on the phone. The answer has to read from three feet away. */
export function TownCheck({ territory }: { territory: RecordValue[] }) {
  const [input, setInput] = useState('');

  const verdict = useMemo(() => gateTown(input, territory), [input, territory]);
  const hasInput = input.trim().length > 0;
  const color = GATE_COLOR[verdict.gate] ?? 'var(--ink-muted)';

  return (
    <div className="panel p-4 sm:p-6">
      <label htmlFor="town-check-input" className="label">Check a town</label>
      <input
        id="town-check-input"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type the town he's calling from…"
        className="input mt-1.5 text-base"
        autoComplete="off"
        autoCorrect="off"
      />

      {hasInput ? (
        <div className="mt-5 border-t border-[color:var(--line)] pt-5">
          <div className="font-display text-5xl uppercase tracking-[0.04em] sm:text-6xl" style={{ color }}>
            {verdict.gate}
          </div>
          <p className="mt-2 text-lg font-medium leading-snug sm:text-xl">{verdict.instruction}</p>
          {verdict.licenseNote && (
            <p className="mt-2 text-sm text-[color:var(--ink-muted)]">{verdict.licenseNote}</p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[color:var(--ink-muted)]">Ask the town before anything else.</p>
      )}
    </div>
  );
}
