import { Briefcase, DollarSign, Calendar, TrendingUp, Clock, Receipt } from 'lucide-react';
import type { Job, JobStatus } from '../types';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '../types';
import { calcBidTotals, formatCurrency } from '../utils';

interface Props {
  jobs: Job[];
  onSelectJob: (id: string) => void;
  onNewJob: () => void;
}

function getWeekStart(): Date {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Dashboard({ jobs, onSelectJob, onNewJob }: Props) {
  const activeJobs = jobs.filter(j => !['completed', 'invoiced'].includes(j.status));
  const totalBidValue = jobs
    .filter(j => ['accepted', 'scheduled', 'in_progress', 'completed', 'invoiced'].includes(j.status))
    .reduce((sum, j) => sum + calcBidTotals(j).total, 0);
  const upcomingSchedule = jobs
    .flatMap(j => j.schedule.map(s => ({ ...s, job: j })))
    .filter(s => s.date >= new Date().toISOString().split('T')[0])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const statusCounts = jobs.reduce(
    (acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pipeline: JobStatus[] = ['prospect', 'scoped', 'bid_sent', 'accepted', 'scheduled', 'in_progress'];

  // Total actual hours this week (completed time entries)
  const weekStart = getWeekStart();
  const hoursThisWeek = jobs.reduce((total, job) => {
    return total + job.timeEntries
      .filter(e => e.clockOut !== null && new Date(e.clockIn) >= weekStart)
      .reduce((sum, e) => {
        const ms = new Date(e.clockOut!).getTime() - new Date(e.clockIn).getTime();
        return sum + ms / 1000 / 3600;
      }, 0);
  }, 0);

  // Total expenses this month
  const monthStart = getMonthStart();
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const expensesThisMonth = jobs.reduce((total, job) => {
    return total + job.expenses
      .filter(e => e.date >= monthStartStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={<Briefcase size={20} />}
          label="Active Jobs"
          value={String(activeJobs.length)}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Revenue Pipeline"
          value={formatCurrency(totalBidValue)}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="Upcoming Days"
          value={String(upcomingSchedule.length)}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Total Jobs"
          value={String(jobs.length)}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Hours This Week"
          value={`${hoursThisWeek.toFixed(1)}h`}
          color="text-teal-600"
          bg="bg-teal-50"
        />
        <StatCard
          icon={<Receipt size={20} />}
          label="Expenses This Month"
          value={formatCurrency(expensesThisMonth)}
          color="text-rose-600"
          bg="bg-rose-50"
        />
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4 text-lg">Job Pipeline</h2>
        <div className="flex flex-wrap gap-3">
          {pipeline.map(status => (
            <div key={status} className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${JOB_STATUS_COLORS[status]}`}>
                {JOB_STATUS_LABELS[status]}
              </span>
              <span className="text-slate-500 font-mono text-sm">{statusCounts[status] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 text-lg">Recent Jobs</h2>
            <button
              onClick={onNewJob}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + New Job
            </button>
          </div>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Briefcase size={32} className="mx-auto mb-2 opacity-40" />
              <p>No jobs yet. Create your first job!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...jobs]
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 6)
                .map(job => {
                  const { total } = calcBidTotals(job);
                  return (
                    <button
                      key={job.id}
                      onClick={() => onSelectJob(job.id)}
                      className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {job.title || 'Untitled Job'}
                        </p>
                        <p className="text-sm text-slate-500 truncate">{job.customer.name || 'No customer'}</p>
                      </div>
                      <div className="ml-3 flex items-center gap-3 flex-shrink-0">
                        {total > 0 && (
                          <span className="text-sm font-medium text-slate-600">
                            {formatCurrency(total)}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_COLORS[job.status]}`}>
                          {JOB_STATUS_LABELS[job.status]}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4 text-lg">Upcoming Schedule</h2>
          {upcomingSchedule.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p>No upcoming schedule entries.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingSchedule.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => onSelectJob(entry.job.id)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="bg-blue-50 text-blue-700 rounded-lg p-2 text-center min-w-[52px]">
                    <p className="text-xs font-medium uppercase">
                      {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                    <p className="text-xl font-bold leading-none">
                      {new Date(entry.date + 'T00:00:00').getDate()}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {entry.job.title || 'Untitled Job'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {entry.startTime} – {entry.endTime}
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-slate-400 truncate">{entry.notes}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`${bg} ${color} p-2 rounded-lg`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
