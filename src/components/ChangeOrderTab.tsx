import { useState } from 'react';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Job, ChangeOrder } from '../types';
import type { useJobStore } from '../store';
import { formatCurrency, formatDate } from '../utils';

interface Props {
  job: Job;
  store: ReturnType<typeof useJobStore>;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  laborHours: '',
  materialCost: '',
};

export default function ChangeOrderTab({ job, store }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const approvedCOs = job.changeOrders.filter(co => co.status === 'approved');
  const approvedValue = approvedCOs.reduce(
    (sum, co) => sum + co.materialCost + co.laborHours * job.bid.laborRate,
    0
  );

  function handleSubmit() {
    if (!form.title.trim()) return;
    store.addChangeOrder(job.id, {
      title: form.title.trim(),
      description: form.description.trim(),
      laborHours: parseFloat(form.laborHours) || 0,
      materialCost: parseFloat(form.materialCost) || 0,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4">
        <div className="text-center">
          <p className="text-xs text-slate-500">Total COs</p>
          <p className="text-xl font-bold text-slate-800">{job.changeOrders.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Approved</p>
          <p className="text-xl font-bold text-green-700">{approvedCOs.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Added Revenue</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(approvedValue)}</p>
        </div>
      </div>

      {/* Add Button / Form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          New Change Order
        </button>
      ) : (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm">New Change Order</h3>

          <label className="block">
            <span className="text-xs text-slate-500 mb-1 block">Title *</span>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Add outdoor outlet"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-xs text-slate-500 mb-1 block">Description</span>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the additional work..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-500 mb-1 block">Additional Labor Hours</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.laborHours}
                onChange={e => setForm(f => ({ ...f, laborHours: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500 mb-1 block">Material Cost ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.materialCost}
                onChange={e => setForm(f => ({ ...f, materialCost: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Preview */}
          {(form.laborHours || form.materialCost) && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              Estimated value:{' '}
              <strong>
                {formatCurrency(
                  (parseFloat(form.laborHours) || 0) * job.bid.laborRate +
                  (parseFloat(form.materialCost) || 0)
                )}
              </strong>
              {' '}({parseFloat(form.laborHours) || 0}h @ {formatCurrency(job.bid.laborRate)}/hr + materials)
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Change Order List */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Change Orders</h3>
        {job.changeOrders.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No change orders yet.</p>
        ) : (
          <div className="space-y-3">
            {[...job.changeOrders]
              .sort((a, b) => b.number - a.number)
              .map(co => (
                <ChangeOrderCard
                  key={co.id}
                  co={co}
                  laborRate={job.bid.laborRate}
                  onApprove={() => store.respondChangeOrder(job.id, co.id, 'approved')}
                  onReject={() => store.respondChangeOrder(job.id, co.id, 'rejected')}
                  onDelete={() => store.removeChangeOrder(job.id, co.id)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeOrderCard({
  co,
  laborRate,
  onApprove,
  onReject,
  onDelete,
}: {
  co: ChangeOrder;
  laborRate: number;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const totalValue = co.laborHours * laborRate + co.materialCost;

  const statusConfig = {
    pending: { icon: <Clock size={14} />, color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
    approved: { icon: <CheckCircle size={14} />, color: 'bg-green-100 text-green-700', label: 'Approved' },
    rejected: { icon: <XCircle size={14} />, color: 'bg-red-100 text-red-700', label: 'Rejected' },
  };
  const status = statusConfig[co.status];

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-mono">CO-{String(co.number).padStart(2, '0')}</span>
            <h4 className="font-semibold text-slate-800">{co.title}</h4>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
          {co.description && (
            <p className="text-sm text-slate-500 mt-1">{co.description}</p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
        >
          ×
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        {co.laborHours > 0 && (
          <span>{co.laborHours}h labor ({formatCurrency(co.laborHours * laborRate)})</span>
        )}
        {co.materialCost > 0 && (
          <span>Materials: {formatCurrency(co.materialCost)}</span>
        )}
        {totalValue > 0 && (
          <span className="font-semibold text-slate-800">Total: {formatCurrency(totalValue)}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>Created {formatDate(co.createdAt)}</span>
        {co.respondedAt && <span>Responded {formatDate(co.respondedAt)}</span>}
      </div>

      {co.status === 'pending' && (
        <div className="flex gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={onApprove}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
          >
            <CheckCircle size={12} />
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
          >
            <XCircle size={12} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
