import type { Job } from '../types';
import { formatDateTime } from '../utils';

interface Props {
  job: Job;
  onUpdateJob: (changes: Partial<Job>) => void;
}

const QUICK_STAMPS = [
  'Left voicemail',
  'Customer called back',
  'Customer approved scope',
  'Permit submitted',
  'Permit approved',
  'Materials ordered',
  'Materials on site',
  'Inspection scheduled',
  'Inspection passed',
  'Payment received',
];

export default function NotesTab({ job, onUpdateJob }: Props) {
  function appendStamp(text: string) {
    const ts = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
    const line = `[${ts}] ${text}`;
    const updated = job.notes ? `${job.notes}\n${line}` : line;
    onUpdateJob({ notes: updated });
  }

  return (
    <div className="space-y-4">
      {/* Quick stamps */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-3 text-sm">Quick Log</h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_STAMPS.map(s => (
            <button
              key={s}
              onClick={() => appendStamp(s)}
              className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* Notes textarea */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700 text-sm">Job Notes</h3>
          {job.notes && (
            <span className="text-xs text-slate-400">
              {job.notes.split('\n').filter(Boolean).length} entries
            </span>
          )}
        </div>
        <textarea
          value={job.notes}
          onChange={e => onUpdateJob({ notes: e.target.value })}
          placeholder="Free-form notes — customer conversations, reminders, site observations, anything that doesn't fit elsewhere…"
          rows={16}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 placeholder-slate-300"
        />
        <p className="text-xs text-slate-400 mt-2">
          Last updated {formatDateTime(job.updatedAt)}
        </p>
      </div>
    </div>
  );
}
