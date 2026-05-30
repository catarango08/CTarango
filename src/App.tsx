import { useState } from 'react';
import { Zap, LayoutDashboard, Briefcase, Menu, X } from 'lucide-react';
import { useJobStore } from './store';
import Dashboard from './components/Dashboard';
import JobList from './components/JobList';
import JobDetail from './components/JobDetail';
import './index.css';

type View = 'dashboard' | 'jobs' | 'job-detail';

export default function App() {
  const store = useJobStore();
  const [view, setView] = useState<View>('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const selectedJob = selectedJobId ? store.jobs.find(j => j.id === selectedJobId) ?? null : null;

  function openJob(id: string) {
    setSelectedJobId(id);
    setView('job-detail');
    setMobileNavOpen(false);
  }

  function createNewJob() {
    const job = store.createJob({ title: '' });
    openJob(job.id);
  }

  function navigate(v: View) {
    setView(v);
    setMobileNavOpen(false);
    if (v !== 'job-detail') setSelectedJobId(null);
  }

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'jobs' as View, label: 'Jobs', icon: <Briefcase size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 p-1.5 rounded-lg">
              <Zap size={18} className="text-yellow-900" />
            </div>
            <span className="font-bold text-slate-800 text-lg leading-none">
              Electric<span className="text-yellow-500">Pro</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === item.id || (view === 'job-detail' && item.id === 'jobs')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button
              onClick={createNewJob}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New Job
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="sm:hidden p-2 text-slate-500"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileNavOpen && (
          <div className="sm:hidden border-t border-slate-100 bg-white p-3 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  view === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button
              onClick={createNewJob}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New Job
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {view === 'dashboard' && (
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
            <Dashboard jobs={store.jobs} onSelectJob={openJob} onNewJob={createNewJob} />
          </div>
        )}

        {view === 'jobs' && (
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Jobs</h1>
            <JobList jobs={store.jobs} onSelectJob={openJob} onNewJob={createNewJob} />
          </div>
        )}

        {view === 'job-detail' && selectedJob && (
          <JobDetail
            job={selectedJob}
            store={store}
            onBack={() => navigate('jobs')}
            onDeleted={() => navigate('jobs')}
          />
        )}

        {view === 'job-detail' && !selectedJob && (
          <div className="text-center py-12 text-slate-400">
            <p>Job not found.</p>
            <button onClick={() => navigate('jobs')} className="mt-2 text-blue-600 hover:underline text-sm">
              Back to Jobs
            </button>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200">
        ElectricPro — Side Job Manager
      </footer>
    </div>
  );
}
