import { Plus, Trash2, Calendar } from 'lucide-react';
import type { Job, ScheduleEntry } from '../types';

interface Props {
  job: Job;
  onAddEntry: () => void;
  onUpdateEntry: (id: string, changes: Partial<ScheduleEntry>) => void;
  onRemoveEntry: (id: string) => void;
}

function hoursFromTimes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

export default function ScheduleTab({ job, onAddEntry, onUpdateEntry, onRemoveEntry }: Props) {
  const today = new Date().toISOString().split('T')[0];

  const sorted = [...job.schedule].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter(e => e.date >= today);
  const past = sorted.filter(e => e.date < today);

  const totalHours = job.schedule.reduce((sum, e) => sum + hoursFromTimes(e.startTime, e.endTime), 0);

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      {job.schedule.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-blue-600 uppercase font-medium">Total Days Scheduled</p>
            <p className="text-2xl font-bold text-blue-800">{job.schedule.length}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 uppercase font-medium">Total Hours</p>
            <p className="text-2xl font-bold text-blue-800">{totalHours.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 uppercase font-medium">Upcoming</p>
            <p className="text-2xl font-bold text-blue-800">{upcoming.length}</p>
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Schedule Entries</h3>
          <button
            onClick={onAddEntry}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={15} />
            Add Day
          </button>
        </div>

        {job.schedule.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p>No schedule entries yet.</p>
            <p className="text-sm">Add days to schedule when you'll do this job.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-3 tracking-wide">Upcoming</h4>
                <div className="space-y-3">
                  {upcoming.map(entry => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      isPast={false}
                      onUpdate={changes => onUpdateEntry(entry.id, changes)}
                      onRemove={() => onRemoveEntry(entry.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-3 tracking-wide">Past</h4>
                <div className="space-y-3 opacity-60">
                  {past.reverse().map(entry => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      isPast={true}
                      onUpdate={changes => onUpdateEntry(entry.id, changes)}
                      onRemove={() => onRemoveEntry(entry.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function EntryRow({
  entry,
  isPast,
  onUpdate,
  onRemove,
}: {
  entry: ScheduleEntry;
  isPast: boolean;
  onUpdate: (changes: Partial<ScheduleEntry>) => void;
  onRemove: () => void;
}) {
  const hours = hoursFromTimes(entry.startTime, entry.endTime);

  return (
    <div className="group flex gap-3 items-start p-3 rounded-lg border border-slate-100 bg-slate-50">
      <div
        className={`text-center p-2 rounded-lg min-w-[52px] ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-blue-600 text-white'}`}
      >
        <p className="text-xs font-medium uppercase">
          {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
        </p>
        <p className="text-xl font-bold leading-none">
          {new Date(entry.date + 'T00:00:00').getDate()}
        </p>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="date"
            value={entry.date}
            onChange={e => onUpdate({ date: e.target.value })}
            className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <div className="flex items-center gap-2 text-sm">
            <input
              type="time"
              value={entry.startTime}
              onChange={e => onUpdate({ startTime: e.target.value })}
              className="px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <span className="text-slate-400">–</span>
            <input
              type="time"
              value={entry.endTime}
              onChange={e => onUpdate({ endTime: e.target.value })}
              className="px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {hours > 0 && (
              <span className="text-slate-500 text-xs">{hours.toFixed(1)} hrs</span>
            )}
          </div>
        </div>
        <input
          type="text"
          value={entry.notes}
          onChange={e => onUpdate({ notes: e.target.value })}
          placeholder="Notes for this day (optional)"
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>
      <button
        onClick={onRemove}
        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 mt-1"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
