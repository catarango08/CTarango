'use client';

import { useState } from 'react';

/**
 * Four drafts, one tap to copy (for Google Voice) or open the phone's text
 * app. Nothing is ever sent from here.
 */
export function MessageDrafts({ first, phone, when, reviewLink }: { first: string; phone: string; when: string; reviewLink: string }) {
  const [eta, setEta] = useState('20');
  const [copied, setCopied] = useState<string | null>(null);
  const hi = first ? `Hi ${first}` : 'Hi';
  const drafts: [string, string][] = [
    ['Confirm', `${hi}, this is Corey with Tarango Electric. You're on the schedule for ${when || '[day/time]'}. Reply here if anything changes. 417-501-4752`],
    ['Day before', `${hi}, Corey with Tarango Electric. Reminder: I'll see you ${when || 'tomorrow'}. Please make sure I can get to the panel. 417-501-4752`],
    ['On my way', `${hi}, Corey with Tarango Electric. I'm on my way, about ${eta || '20'} minutes out.`],
    ['Thanks + review', `${hi}, thanks for having me out today. If you have a minute, a Google review helps a small shop a lot: ${reviewLink}`],
  ];
  const tel = phone.replace(/[^\d+]/g, '');
  async function copy(label: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(null), 1500); } catch { setCopied('Copy blocked — long-press the text'); }
  }
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <span className="label">ETA minutes</span>
        <input className="input w-24" type="number" inputMode="numeric" value={eta} onChange={(e) => setEta(e.target.value)} />
      </label>
      {drafts.map(([label, text]) => (
        <div key={label} className="panel-2 p-3">
          <div className="label mb-1">{label}</div>
          <p className="mb-2 select-all text-sm">{text}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn justify-center" onClick={() => copy(label, text)}>{copied === label ? 'Copied ✓' : 'Copy'}</button>
            {tel ? <a className="btn justify-center" href={`sms:${tel}?&body=${encodeURIComponent(text)}`}>Open text</a> : <span />}
          </div>
        </div>
      ))}
      <p className="text-xs text-[color:var(--ink-muted)]">Nothing sends by itself. You send it.</p>
    </div>
  );
}
