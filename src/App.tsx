import { useState } from 'react';
import {
  Zap, LayoutDashboard, Briefcase, CalendarDays, Menu, X,
  Settings, CloudIcon, CloudOff, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useJobStore } from './store';
import Dashboard from './components/Dashboard';
import JobList from './components/JobList';
import JobDetail from './components/JobDetail';
import CalendarView from './components/CalendarView';
import SettingsModal from './components/SettingsModal';
import * as drive from './lib/drive';
import './index.css';

type View = 'dashboard' | 'jobs' | 'calendar' | 'job-detail';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export default function App() {
  const store = useJobStore();
  const [view, setView] = useState<View>('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [driveConnected, setDriveConnected] = useState(drive.isConnected());
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState('');

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

  async function syncToDrive() {
    if (!store.settings.googleClientId) return;
    setSyncState('syncing');
    setSyncError('');
    try {
      await drive.saveJobs(store.settings.googleClientId, store.jobs);
      setSyncState('success');
      setTimeout(() => setSyncState('idle'), 3000);
    } catch (e: any) {
      setSyncError(e?.message ?? 'Sync failed');
      setSyncState('error');
    }
  }

  async function loadFromDrive() {
    if (!store.settings.googleClientId) return;
    setSyncState('syncing');
    setSyncError('');
    try {
      const data = await drive.loadJobs(store.settings.googleClientId);
      if (data && Array.isArray(data)) {
        store.replaceAllJobs(data as any);
        setSyncState('success');
        setTimeout(() => setSyncState('idle'), 3000);
      } else {
        setSyncError('No data found in Drive');
        setSyncState('error');
      }
    } catch (e: any) {
      setSyncError(e?.message ?? 'Load failed');
      setSyncState('error');
    }
  }

  function handleDriveConnect() {
    setDriveConnected(true);
  }

  function handleDriveDisconnect() {
    drive.disconnect();
    setDriveConnected(false);
    setSyncState('idle');
  }

  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'jobs', label: 'Jobs', icon: <Briefcase size={18} /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-yellow-400 p-1.5 rounded-lg">
              <Zap size={18} className="text-yellow-900" />
            </div>
            <span className="font-bold text-slate-800 text-lg leading-none">
              Electric<span className="text-yellow-500">Pro</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1 flex-1">
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

          {/* Drive status + settings (desktop) */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {driveConnected && (
              <div className="flex items-center gap-1.5">
                {syncState === 'syncing' && (
                  <Loader2 size={14} className="text-blue-500 animate-spin" />
                )}
                {syncState === 'success' && (
                  <CheckCircle2 size={14} className="text-emerald-500" />
                )}
                {syncState === 'error' && (
                  <span title={syncError}><AlertCircle size={14} className="text-red-500" /></span>
                )}
                <button
                  onClick={syncToDrive}
                  disabled={syncState === 'syncing'}
                  title="Save to Google Drive"
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-60"
                >
                  <CloudIcon size={13} />
                  Save to Drive
                </button>
                <button
                  onClick={loadFromDrive}
                  disabled={syncState === 'syncing'}
                  title="Load from Google Drive"
                  className="text-xs px-2.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  Load
                </button>
              </div>
            )}
            {!driveConnected && store.settings.googleClientId && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <CloudOff size={13} /> Drive off
              </span>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>

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
                  view === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
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
            <div className="border-t border-slate-100 pt-2 flex gap-2">
              {driveConnected && (
                <>
                  <button
                    onClick={syncToDrive}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg"
                  >
                    <CloudIcon size={13} /> Save
                  </button>
                  <button
                    onClick={loadFromDrive}
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 text-slate-600 rounded-lg"
                  >
                    Load
                  </button>
                </>
              )}
              <button
                onClick={() => { setShowSettings(true); setMobileNavOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-slate-600 py-2 border border-slate-200 rounded-lg"
              >
                <Settings size={15} /> Settings
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Sync error banner */}
      {syncState === 'error' && syncError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />
          Drive sync error: {syncError}
          <button onClick={() => setSyncState('idle')} className="ml-auto text-red-400 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

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

        {view === 'calendar' && (
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Calendar</h1>
            <CalendarView jobs={store.jobs} onSelectJob={openJob} />
          </div>
        )}

        {view === 'job-detail' && selectedJob && (
          <JobDetail
            job={selectedJob}
            store={store}
            driveConnected={driveConnected}
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

      {showSettings && (
        <SettingsModal
          settings={store.settings}
          driveConnected={driveConnected}
          onSave={s => store.updateSettings(s)}
          onClose={() => setShowSettings(false)}
          onDriveConnect={handleDriveConnect}
          onDriveDisconnect={handleDriveDisconnect}
        />
      )}
    </div>
  );
}
