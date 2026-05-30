import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Job } from '../types';
import { JOB_STATUS_COLORS } from '../types';

interface Props {
  jobs: Job[];
  onSelectJob: (id: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ jobs, onSelectJob }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Build map: 'YYYY-MM-DD' -> [{job, entry}]
  type CalEntry = { job: Job; startTime: string; endTime: string; entryId: string };
  const dayMap = new Map<string, CalEntry[]>();

  for (const job of jobs) {
    for (const entry of job.schedule) {
      const [ey, em] = entry.date.split('-').map(Number);
      if (ey === year && em - 1 === month) {
        if (!dayMap.has(entry.date)) dayMap.set(entry.date, []);
        dayMap.get(entry.date)!.push({ job, startTime: entry.startTime, endTime: entry.endTime, entryId: entry.id });
      }
    }
  }

  // Build the 6x7 grid
  const cells: Array<{ day: number; currentMonth: boolean; dateStr: string }> = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    const d = daysInPrevMonth - firstDayOfMonth + 1 + i;
    const prevM = month === 0 ? 12 : month;
    const prevY = month === 0 ? year - 1 : year;
    cells.push({ day: d, currentMonth: false, dateStr: `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      currentMonth: true,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextM = month === 11 ? 1 : month + 2;
    const nextY = month === 11 ? year + 1 : year;
    cells.push({ day: d, currentMonth: false, dateStr: `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
            className="px-3 py-1.5 text-sm rounded-lg hover:bg-slate-100 text-slate-600 transition-colors font-medium"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-slate-100">
        {cells.map((cell, idx) => {
          const entries = dayMap.get(cell.dateStr) ?? [];
          const isToday = cell.dateStr === todayStr;
          const isCurrentMonth = cell.currentMonth;

          return (
            <div
              key={idx}
              className={`min-h-[90px] p-1.5 border-b border-slate-100 ${!isCurrentMonth ? 'bg-slate-50' : ''}`}
            >
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 font-medium ${
                  isToday
                    ? 'bg-blue-600 text-white'
                    : isCurrentMonth
                    ? 'text-slate-700'
                    : 'text-slate-300'
                }`}
              >
                {cell.day}
              </div>
              <div className="space-y-0.5">
                {entries.slice(0, 3).map(e => (
                  <button
                    key={e.entryId}
                    onClick={() => onSelectJob(e.job.id)}
                    title={`${e.job.title || 'Untitled'} — ${e.startTime}–${e.endTime}`}
                    className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium ${JOB_STATUS_COLORS[e.job.status]} hover:opacity-80 transition-opacity`}
                  >
                    {e.job.title || 'Untitled'}
                  </button>
                ))}
                {entries.length > 3 && (
                  <p className="text-xs text-slate-400 px-1">+{entries.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
