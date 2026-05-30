import { useState } from 'react';
import { Search, Plus, ChevronRight } from 'lucide-react';
import type { Job, JobStatus } from '../types';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '../types';
import { calcBidTotals, formatCurrency, formatDate } from '../utils';

interface Props {
  jobs: Job[];
  onSelectJob: (id: string) => void;
  onNewJob: () => void;
}

const STATUS_ORDER: JobStatus[] = [
  'prospect', 'scoped', 'bid_sent', 'accepted', 'scheduled', 'in_progress', 'completed', 'invoiced',
];

export default function JobList({ jobs, onSelectJob, onNewJob }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all');

  const filtered = jobs.filter(j => {
    const matchesSearch =
      !search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      j.customer.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || j.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const si = STATUS_ORDER.indexOf(a.status);
    const sj = STATUS_ORDER.indexOf(b.status);
    if (si !== sj) return si - sj;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs, customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as JobStatus | 'all')}
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Statuses</option>
          {STATUS_ORDER.map(s => (
            <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={onNewJob}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Job
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <p className="text-lg mb-1">No jobs found</p>
          <p className="text-sm">
            {jobs.length === 0 ? 'Create your first job to get started.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {sorted.map(job => {
            const { total } = calcBidTotals(job);
            const nextDate = job.schedule
              .filter(s => s.date >= new Date().toISOString().split('T')[0])
              .sort((a, b) => a.date.localeCompare(b.date))[0];
            return (
              <button
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className="w-full text-left flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_COLORS[job.status]}`}>
                      {JOB_STATUS_LABELS[job.status]}
                    </span>
                    <h3 className="font-semibold text-slate-800 truncate">
                      {job.title || 'Untitled Job'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    {job.customer.name && <span>{job.customer.name}</span>}
                    {job.customer.address && (
                      <span className="hidden sm:inline truncate max-w-xs">{job.customer.address}</span>
                    )}
                    {nextDate && (
                      <span className="text-purple-600 font-medium">
                        Next: {formatDate(nextDate.date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-4 flex-shrink-0">
                  {total > 0 && (
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold text-slate-800">{formatCurrency(total)}</p>
                      <p className="text-xs text-slate-400">
                        {job.bid.status === 'draft' ? 'Draft' : `Bid ${job.bid.status}`}
                      </p>
                    </div>
                  )}
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
