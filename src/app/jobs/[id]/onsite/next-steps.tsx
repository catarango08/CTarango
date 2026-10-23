'use client';

import { useState } from 'react';
import { enqueue } from '@/lib/client/sync';

const STEPS: [string, string, string][] = [
  ['needs-quote', 'Needs quote', 'Estimator'],
  ['schedule-return', 'Schedule return', 'Office Manager'],
  ['ready-to-invoice', 'Ready to invoice', 'Office Manager'],
];

/** After Done: the summary goes to the office as a task row with an owner. */
export function NextSteps({ jobId }: { jobId: string }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  return (
    <div className="grid gap-2">
      {STEPS.map(([kind, label, who]) => (
        <button key={kind} type="button" disabled={done.has(kind)} className="btn min-h-14 justify-between text-base"
          onClick={() => { enqueue({ url: `/api/jobs/${jobId}/task`, method: 'POST', body: { kind } }); setDone(new Set([...done, kind])); }}>
          <span>{label}</span><span className="text-sm text-[color:var(--ink-muted)]">{done.has(kind) ? 'Task created ✓' : `→ ${who}`}</span>
        </button>
      ))}
    </div>
  );
}
