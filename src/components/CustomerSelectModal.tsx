import { useState } from 'react';
import { X, Search, User } from 'lucide-react';
import type { CustomerRecord } from '../types';

interface Props {
  customers: CustomerRecord[];
  onSelect: (c: CustomerRecord) => void;
  onClose: () => void;
}

export default function CustomerSelectModal({ customers, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const filtered = customers.filter(c => {
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-lg">Select Customer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search customers..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {customers.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <User size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No customers yet.</p>
              <p className="text-xs mt-1">Add customers in the Customers page.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No results for "{query}"</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-medium text-slate-800">{c.name}</p>
                  <p className="text-sm text-slate-500">
                    {[c.phone, c.email].filter(Boolean).join(' · ')}
                  </p>
                  {c.address && <p className="text-xs text-slate-400 mt-0.5">{c.address}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
