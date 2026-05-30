import { Plus, Trash2, FileText, Send } from 'lucide-react';
import type { Job } from '../types';
import { calcBidTotals, formatCurrency } from '../utils';

interface Props {
  job: Job;
  onUpdateJob: (changes: Partial<Job>) => void;
  onAddMaterial: () => void;
  onUpdateMaterial: (id: string, changes: Partial<{ name: string; quantity: number; unitCost: number; supplier: string }>) => void;
  onRemoveMaterial: (id: string) => void;
}

export default function BidTab({
  job,
  onUpdateJob,
  onAddMaterial,
  onUpdateMaterial,
  onRemoveMaterial,
}: Props) {
  const { labor, materialsCost, materialsWithMarkup, total } = calcBidTotals(job);

  function updateBid(changes: Partial<Job['bid']>) {
    onUpdateJob({ bid: { ...job.bid, ...changes } });
  }

  function markSent() {
    updateBid({ status: 'sent', sentAt: new Date().toISOString() });
    onUpdateJob({ status: 'bid_sent', bid: { ...job.bid, status: 'sent', sentAt: new Date().toISOString() } });
  }

  const BID_STATUS_COLORS = {
    draft: 'bg-slate-100 text-slate-600',
    sent: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Labor */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Labor</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-slate-600 mb-1 block">Hourly Rate ($/hr)</span>
            <input
              type="number"
              min={0}
              value={job.bid.laborRate}
              onChange={e => updateBid({ laborRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600 mb-1 block">Estimated Hours</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={job.bid.laborHours}
              onChange={e => updateBid({ laborHours: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
        <div className="mt-3 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-slate-600">Labor Subtotal</span>
          <span className="font-semibold text-slate-800">{formatCurrency(labor)}</span>
        </div>
      </section>

      {/* Materials */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Materials</h3>
          <button
            onClick={onAddMaterial}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={15} />
            Add Material
          </button>
        </div>
        <label className="flex items-center gap-2 mb-4">
          <span className="text-sm text-slate-600">Material Markup</span>
          <input
            type="number"
            min={0}
            max={200}
            value={job.bid.materialMarkup}
            onChange={e => updateBid({ materialMarkup: parseFloat(e.target.value) || 0 })}
            className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-500">%</span>
        </label>

        {job.materials.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No materials added yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Material</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Unit Cost</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {job.materials.map(mat => (
                    <tr key={mat.id} className="group">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={mat.name}
                          onChange={e => onUpdateMaterial(mat.id, { name: e.target.value })}
                          placeholder="e.g. 20A breaker"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={mat.quantity}
                          onChange={e => onUpdateMaterial(mat.id, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center">
                          <span className="text-slate-400 mr-1">$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={mat.unitCost}
                            onChange={e => onUpdateMaterial(mat.id, { unitCost: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-right font-medium text-slate-700">
                        {formatCurrency(mat.quantity * mat.unitCost)}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => onRemoveMaterial(mat.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Materials Cost</span>
                <span>{formatCurrency(materialsCost)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>+ {job.bid.materialMarkup}% Markup</span>
                <span>{formatCurrency(materialsWithMarkup - materialsCost)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-700">
                <span>Materials Subtotal</span>
                <span>{formatCurrency(materialsWithMarkup)}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Summary */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Bid Summary</h3>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Labor ({job.bid.laborHours} hrs @ {formatCurrency(job.bid.laborRate)}/hr)</span>
            <span>{formatCurrency(labor)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Materials (with {job.bid.materialMarkup}% markup)</span>
            <span>{formatCurrency(materialsWithMarkup)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-800 border-t border-slate-200 pt-2">
            <span>Total Bid</span>
            <span className="text-blue-700">{formatCurrency(total)}</span>
          </div>
        </div>

        <textarea
          value={job.bid.notes}
          onChange={e => updateBid({ notes: e.target.value })}
          placeholder="Bid notes, terms, exclusions..."
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Bid Status:</span>
            <select
              value={job.bid.status}
              onChange={e => updateBid({ status: e.target.value as Job['bid']['status'] })}
              className={`px-3 py-1 rounded-full text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${BID_STATUS_COLORS[job.bid.status]}`}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              <FileText size={15} />
              Print
            </button>
            {job.bid.status === 'draft' && (
              <button
                onClick={markSent}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Send size={15} />
                Mark Sent
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
