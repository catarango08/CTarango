import { useState } from 'react';
import { ArrowLeft, Trash2, User, MapPin, Phone, Mail, Users } from 'lucide-react';
import type { Job, JobStatus } from '../types';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '../types';
import type { useJobStore } from '../store';
import ScopeTab from './ScopeTab';
import BidTab from './BidTab';
import ScheduleTab from './ScheduleTab';
import InvoiceTab from './InvoiceTab';
import PhotosTab from './PhotosTab';
import SafetyTab from './SafetyTab';
import TimeTrackingTab from './TimeTrackingTab';
import ExpenseTab from './ExpenseTab';
import ChangeOrderTab from './ChangeOrderTab';
import PnLTab from './PnLTab';
import CustomerSelectModal from './CustomerSelectModal';
import { calcBidTotals, formatCurrency, formatDateTime } from '../utils';

interface Props {
  job: Job;
  store: ReturnType<typeof useJobStore>;
  driveConnected: boolean;
  onBack: () => void;
  onDeleted: () => void;
}

type Tab = 'scope' | 'bid' | 'change-orders' | 'schedule' | 'time' | 'expenses' | 'pnl' | 'invoice' | 'photos' | 'safety';

const STATUS_FLOW: JobStatus[] = [
  'prospect', 'scoped', 'bid_sent', 'accepted', 'scheduled', 'in_progress', 'completed', 'invoiced',
];

export default function JobDetail({ job, store, driveConnected, onBack, onDeleted }: Props) {
  const [tab, setTab] = useState<Tab>('scope');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const { total } = calcBidTotals(job);

  const safetyTotal = 42; // total NFPA 70E items
  const safetyDone = Object.values(job.safetyChecklist ?? {}).filter(Boolean).length;

  const approvedCOCount = job.changeOrders.filter(co => co.status === 'approved').length;
  const pendingCOCount = job.changeOrders.filter(co => co.status === 'pending').length;

  const tabs: { id: Tab; label: string; badge?: number; badgeColor?: string }[] = [
    { id: 'scope', label: 'Scope' },
    { id: 'bid', label: 'Bid' },
    {
      id: 'change-orders',
      label: 'Change Orders',
      badge: pendingCOCount > 0 ? pendingCOCount : approvedCOCount > 0 ? approvedCOCount : undefined,
      badgeColor: pendingCOCount > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700',
    },
    { id: 'schedule', label: 'Schedule' },
    {
      id: 'time',
      label: 'Time',
      badge: job.timeEntries.length > 0 ? job.timeEntries.length : undefined,
    },
    {
      id: 'expenses',
      label: 'Expenses',
      badge: job.expenses.length > 0 ? job.expenses.length : undefined,
    },
    { id: 'pnl', label: 'P&L' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'photos', label: 'Photos', badge: job.photos.length || undefined },
    {
      id: 'safety',
      label: 'Safety',
      badge: safetyDone > 0 ? safetyDone : undefined,
      badgeColor: safetyDone === safetyTotal ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <select
              value={job.status}
              onChange={e => store.updateStatus(job.id, e.target.value as JobStatus)}
              className={`px-3 py-1 rounded-full text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${JOB_STATUS_COLORS[job.status]}`}
            >
              {STATUS_FLOW.map(s => (
                <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-slate-300 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="text"
            value={job.title}
            onChange={e => store.updateJob(job.id, { title: e.target.value })}
            placeholder="Job Title"
            className="text-2xl font-bold text-slate-800 w-full border-0 border-b-2 border-transparent hover:border-slate-200 focus:border-blue-400 focus:outline-none pb-1 bg-transparent transition-colors"
          />
        </div>

        {total > 0 && (
          <div className="mt-2 text-lg font-semibold text-blue-700">
            {formatCurrency(total)}
          </div>
        )}

        {/* Customer Info */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Customer</span>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Users size={12} />
              Pick Customer
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <User size={15} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={job.customer.name}
                onChange={e => store.updateJob(job.id, { customer: { ...job.customer, name: e.target.value } })}
                placeholder="Customer name"
                className="flex-1 text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Phone size={15} className="text-slate-400 flex-shrink-0" />
              <input
                type="tel"
                value={job.customer.phone}
                onChange={e => store.updateJob(job.id, { customer: { ...job.customer, phone: e.target.value } })}
                placeholder="Phone"
                className="flex-1 text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Mail size={15} className="text-slate-400 flex-shrink-0" />
              <input
                type="email"
                value={job.customer.email}
                onChange={e => store.updateJob(job.id, { customer: { ...job.customer, email: e.target.value } })}
                placeholder="Email"
                className="flex-1 text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={job.customer.address}
                onChange={e => store.updateJob(job.id, { customer: { ...job.customer, address: e.target.value } })}
                placeholder="Job site address"
                className="flex-1 text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Last updated {formatDateTime(job.updatedAt)}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none ${t.badgeColor ?? 'bg-blue-100 text-blue-700'}`}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'scope' && (
        <ScopeTab
          job={job}
          onUpdateJob={changes => store.updateJob(job.id, changes)}
          onAddScopeItem={() => store.addScopeItem(job.id)}
          onUpdateScopeItem={(id, changes) => store.updateScopeItem(job.id, id, changes)}
          onRemoveScopeItem={id => store.removeScopeItem(job.id, id)}
        />
      )}

      {tab === 'bid' && (
        <BidTab
          job={job}
          business={store.settings.business}
          onUpdateJob={changes => store.updateJob(job.id, changes)}
          onAddMaterial={() => store.addMaterial(job.id)}
          onUpdateMaterial={(id, changes) => store.updateMaterial(job.id, id, changes)}
          onRemoveMaterial={id => store.removeMaterial(job.id, id)}
        />
      )}

      {tab === 'change-orders' && (
        <ChangeOrderTab job={job} store={store} />
      )}

      {tab === 'schedule' && (
        <ScheduleTab
          job={job}
          onAddEntry={() => store.addScheduleEntry(job.id)}
          onUpdateEntry={(id, changes) => store.updateScheduleEntry(job.id, id, changes)}
          onRemoveEntry={id => store.removeScheduleEntry(job.id, id)}
        />
      )}

      {tab === 'time' && (
        <TimeTrackingTab job={job} store={store} />
      )}

      {tab === 'expenses' && (
        <ExpenseTab job={job} store={store} />
      )}

      {tab === 'pnl' && (
        <PnLTab job={job} laborRate={store.settings.defaultLaborRate} />
      )}

      {tab === 'invoice' && (
        <InvoiceTab
          job={job}
          business={store.settings.business}
          onUpdateJob={changes => store.updateJob(job.id, changes)}
          onGenerateNumber={() => store.nextInvoiceNumber()}
        />
      )}

      {tab === 'photos' && (
        <PhotosTab
          job={job}
          googleClientId={store.settings.googleClientId}
          driveConnected={driveConnected}
          onAddPhoto={photo => store.addPhoto(job.id, photo)}
          onUpdatePhoto={(id, changes) => store.updatePhoto(job.id, id, changes)}
          onRemovePhoto={id => store.removePhoto(job.id, id)}
        />
      )}

      {tab === 'safety' && (
        <SafetyTab
          checklist={job.safetyChecklist ?? {}}
          onToggle={(itemId, checked) => store.toggleSafetyItem(job.id, itemId, checked)}
        />
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-800 text-lg mb-2">Delete Job?</h3>
            <p className="text-slate-500 text-sm mb-5">
              This will permanently delete "{job.title || 'Untitled Job'}" and all its data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { store.deleteJob(job.id); onDeleted(); }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Select Modal */}
      {showCustomerModal && (
        <CustomerSelectModal
          customers={store.customers}
          onSelect={c => {
            store.updateJob(job.id, {
              customer: {
                name: c.name,
                phone: c.phone,
                email: c.email,
                address: c.address,
              },
            });
            setShowCustomerModal(false);
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
}
