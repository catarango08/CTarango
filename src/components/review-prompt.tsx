'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Review request at close. Corey copies the text or opens his own Messages app
 * with it filled in (sms: link). Nothing sends from the app. Either way the
 * job's Review asked box is ticked and the request is logged.
 */
export function ReviewPrompt({ jobId, phone, text, linkMissing, done }: { jobId: string; phone: string; text: string; linkMissing: boolean; done: boolean }) {
  const router = useRouter();
  const [logged, setLogged] = useState(done);
  const [msg, setMsg] = useState<string | null>(null);

  async function log(method: 'text' | 'copy') {
    const res = await fetch(`/api/jobs/${jobId}/review-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method }) });
    if (res.ok) {
      setLogged(true);
      router.refresh();
    } else setMsg('Could not log it. Try again.');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copied. Paste it into your text app.');
    } catch {
      setMsg('Copy failed. Select the text and copy it by hand.');
    }
    await log('copy');
  }

  const sms = phone ? `sms:${phone}?&body=${encodeURIComponent(text)}` : '';

  return (
    <div className="rounded border border-[color:var(--accent)] bg-[color:var(--accent)]/10 p-3">
      <p className="text-sm font-semibold">{logged ? 'Review requested ✓' : 'Ask for the review before you leave'}</p>
      <p className="mt-2 whitespace-pre-line rounded bg-[color:var(--surface)] p-2 text-sm">{text}</p>
      {linkMissing && <p className="mt-1 text-xs text-[color:var(--ink-muted)]">The Google review link is a placeholder. Set it in src/config/close.ts.</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {sms && <a className="btn-primary min-h-11" href={sms} onClick={() => void log('text')}>Open in Messages</a>}
        <button type="button" className="btn min-h-11" onClick={() => void copy()}>Copy text</button>
      </div>
      {msg && <p className="mt-1 text-xs text-[color:var(--ink-muted)]">{msg}</p>}
    </div>
  );
}
