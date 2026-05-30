import { useState, useEffect } from 'react';
import { Play, Square, Trash2, Clock } from 'lucide-react';
import type { Job, TimeEntry } from '../types';
import type { useJobStore } from '../store';

interface Props {
  job: Job;
  store: ReturnType<typeof useJobStore>;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function entryDurationMs(entry: TimeEntry): number {
  const start = new Date(entry.clockIn).getTime();
  const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now();
  return end - start;
}

function formatHours(ms: number): string {
  return (ms / 1000 / 3600).toFixed(2);
}

export default function TimeTrackingTab({ job, store }: Props) {
  const [now, setNow] = useState(Date.now());
  const [pendingNotes, setPendingNotes] = useState('');

  const activeEntry = job.timeEntries.find(e => e.clockOut === null) ?? null;

  // Tick every second when clocked in
  useEffect(() => {
    if (!activeEntry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeEntry]);

  const completedEntries = job.timeEntries.filter(e => e.clockOut !== null);
  const totalCompletedMs = completedEntries.reduce((sum, e) => sum + entryDurationMs(e), 0);
  const activeMs = activeEntry ? now - new Date(activeEntry.clockIn).getTime() : 0;
  const totalMs = totalCompletedMs + activeMs;
  const totalHours = totalMs / 1000 / 3600;
  const bidHours = job.bid.laborHours;

  function handleClockIn() {
    store.clockIn(job.id);
    setPendingNotes('');
  }

  function handleClockOut() {
    if (!activeEntry) return;
    store.clockOut(job.id, activeEntry.id, pendingNotes);
    setPendingNotes('');
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-6">
      {/* Clock In/Out Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          {activeEntry ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-green-600">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Clocked In</span>
              </div>
              <div className="text-3xl font-mono font-bold text-slate-800">
                {formatDuration(activeMs)}
              </div>
              <p className="text-xs text-slate-400">
                Since {new Date(activeEntry.clockIn).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div className="text-slate-400 flex items-center gap-2">
              <Clock size={20} />
              <span className="text-sm">Not clocked in</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          {activeEntry ? (
            <>
              <input
                type="text"
                value={pendingNotes}
                onChange={e => setPendingNotes(e.target.value)}
                placeholder="Notes for this session (optional)"
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
              <button
                onClick={handleClockOut}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <Square size={15} />
                Clock Out
              </button>
            </>
          ) : (
            <button
              onClick={handleClockIn}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Play size={15} />
              Clock In
            </button>
          )}
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4">
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Actual Hours</p>
          <p className="text-xl font-bold text-slate-800">{totalHours.toFixed(2)}h</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Bid Hours</p>
          <p className="text-xl font-bold text-slate-600">{bidHours.toFixed(2)}h</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Variance</p>
          <p className={`text-xl font-bold ${totalHours > bidHours ? 'text-red-600' : 'text-green-600'}`}>
            {totalHours > bidHours ? '+' : ''}{(totalHours - bidHours).toFixed(2)}h
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {bidHours > 0 && (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress vs Bid</span>
            <span>{Math.round((totalHours / bidHours) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${totalHours > bidHours ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min((totalHours / bidHours) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Time Entry History */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Session History</h3>
        {job.timeEntries.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No time entries yet. Click Clock In to start.</p>
        ) : (
          <div className="space-y-2">
            {[...job.timeEntries].reverse().map(entry => {
              const isActive = entry.clockOut === null;
              const durMs = entryDurationMs(entry);
              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${isActive ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700">
                        {new Date(entry.clockIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-slate-500">
                        {new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {entry.clockOut
                          ? ` – ${new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : ' – now'}
                      </span>
                      <span className={`font-mono text-sm ${isActive ? 'text-green-700' : 'text-slate-600'}`}>
                        {isActive ? formatDuration(activeMs) : `${formatHours(durMs)}h`}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{entry.notes}</p>
                    )}
                  </div>
                  {!isActive && (
                    <button
                      onClick={() => store.removeTimeEntry(job.id, entry.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
