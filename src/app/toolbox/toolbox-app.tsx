'use client';

import { useEffect, useState } from 'react';
import { EditionPicker, useEdition } from './shared';
import * as T from './tools';

const TOOLS = [
  { id: 'knockouts', name: 'Knockout / hole saw', icon: '⭕', code: false, C: T.Knockouts },
  { id: 'ohms', name: "Ohm's law / power", icon: 'Ω', code: false, C: T.OhmsLaw },
  { id: 'torque', name: 'Torque', icon: '🔧', code: false, C: T.Torque },
  { id: 'vdrop', name: 'Voltage drop', icon: '📉', code: true, C: T.VoltageDrop },
  { id: 'ampacity', name: 'Ampacity / breaker', icon: '⚡', code: true, C: T.Ampacity },
  { id: 'boxfill', name: 'Box fill', icon: '📦', code: true, C: T.BoxFill },
  { id: 'conduit', name: 'Conduit fill', icon: '🟢', code: true, C: T.ConduitFill },
  { id: 'motor', name: 'Motor FLC', icon: '⚙️', code: true, C: T.Motors },
  { id: 'burial', name: 'Burial depth', icon: '⛏️', code: true, C: T.Burial },
  { id: 'grounding', name: 'GEC / EGC', icon: '⏚', code: true, C: T.Grounding },
  { id: 'service', name: 'Service load calc', icon: '🏠', code: true, C: T.ServiceLoad },
] as const;

export function ToolboxApp() {
  const [edition, setEdition] = useEdition();
  const [tool, setTool] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setTool(location.hash.slice(1) || null);
    read(); window.addEventListener('hashchange', read);
    // Cache Toolbox for no-signal use. Scoped to /toolbox so the rest of the app is untouched.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/toolbox-sw.js', { scope: '/toolbox' }).catch(() => {});
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const cur = TOOLS.find((t) => t.id === tool);
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-2">
        {cur && <a href="#" onClick={(e) => { e.preventDefault(); history.pushState(null, '', location.pathname); setTool(null); }} className="btn min-h-12 min-w-12 justify-center" aria-label="All tools">←</a>}
        <h1 className="display text-2xl">{cur ? cur.name : 'Toolbox'}</h1>
      </div>
      {(!cur || cur.code) && <EditionPicker edition={edition} onChange={setEdition} />}
      {cur ? (
        <section className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-3"><cur.C edition={edition} /></section>
      ) : (
        <div className="grid grid-cols-2 gap-2" data-testid="tool-grid">
          {TOOLS.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="btn min-h-20 flex-col justify-center text-center">
              <span className="text-2xl" aria-hidden>{t.icon}</span>
              <span className="text-sm font-semibold">{t.name}</span>
            </a>
          ))}
        </div>
      )}
      <p className="text-xs text-[color:var(--ink-muted)]">Works with no signal once opened. NEC data supplied by Sparky (Oct 24, 2026). Orange VERIFY marks cells he could not confirm.</p>
    </div>
  );
}
