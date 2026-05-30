import { Plus, Trash2 } from 'lucide-react';
import type { Job } from '../types';

interface Props {
  job: Job;
  onUpdateJob: (changes: Partial<Job>) => void;
  onAddScopeItem: () => void;
  onUpdateScopeItem: (id: string, changes: { description?: string; notes?: string }) => void;
  onRemoveScopeItem: (id: string) => void;
}

export default function ScopeTab({
  job,
  onUpdateJob,
  onAddScopeItem,
  onUpdateScopeItem,
  onRemoveScopeItem,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-3">Scope Overview</h3>
        <textarea
          value={job.scopeDescription}
          onChange={e => onUpdateJob({ scopeDescription: e.target.value })}
          placeholder="Describe the work to be done, site conditions, access requirements..."
          rows={4}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </section>

      {/* Work Items */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Work Items</h3>
          <button
            onClick={onAddScopeItem}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={15} />
            Add Item
          </button>
        </div>

        {job.scopeItems.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">
            No work items yet. Add items to detail the scope.
          </p>
        ) : (
          <div className="space-y-3">
            {job.scopeItems.map((item, idx) => (
              <div key={item.id} className="flex gap-3 group">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-sm font-medium flex items-center justify-center mt-1">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => onUpdateScopeItem(item.id, { description: e.target.value })}
                    placeholder="Work item description (e.g. Install 200A panel)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={item.notes}
                    onChange={e => onUpdateScopeItem(item.id, { notes: e.target.value })}
                    placeholder="Additional notes (optional)"
                    className="w-full px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => onRemoveScopeItem(item.id)}
                  className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors mt-2 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
