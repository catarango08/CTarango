import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, User, Phone, Mail, MapPin, FileText } from 'lucide-react';
import type { CustomerRecord } from '../types';
import type { useJobStore } from '../store';
import type { Job } from '../types';
import { formatDate } from '../utils';

interface Props {
  store: ReturnType<typeof useJobStore>;
  jobs: Job[];
  onSelectJob: (id: string) => void;
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

export default function CustomerDB({ store, jobs, onSelectJob }: Props) {
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { customers } = store;

  const filtered = customers.filter(c => {
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(c: CustomerRecord) {
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, notes: c.notes });
    setEditId(c.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editId) {
      store.updateCustomer(editId, form);
    } else {
      store.createCustomer(form);
    }
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  const selected = selectedId ? customers.find(c => c.id === selectedId) ?? null : null;
  const customerJobs = selected
    ? jobs.filter(j => j.customer.name.toLowerCase() === selected.name.toLowerCase())
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          New Customer
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Customer list */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              <User size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">{query ? 'No results' : 'No customers yet'}</p>
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  c.id === selectedId
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                    {c.phone && <p className="text-xs text-slate-500 mt-0.5">{c.phone}</p>}
                    {c.email && <p className="text-xs text-slate-500 truncate">{c.email}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(c); }}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteId(c.id); }}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Added {formatDate(c.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-slate-800">{selected.name}</h2>
                <button
                  onClick={() => openEdit(selected)}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>

              <div className="space-y-2 text-sm">
                {selected.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <a href={`tel:${selected.phone}`} className="hover:text-blue-600">{selected.phone}</a>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} className="text-slate-400" />
                    <a href={`mailto:${selected.email}`} className="hover:text-blue-600">{selected.email}</a>
                  </div>
                )}
                {selected.address && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin size={14} className="text-slate-400 mt-0.5" />
                    <span>{selected.address}</span>
                  </div>
                )}
                {selected.notes && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <FileText size={14} className="text-slate-400 mt-0.5" />
                    <span className="whitespace-pre-wrap">{selected.notes}</span>
                  </div>
                )}
              </div>

              {/* Jobs linked to this customer */}
              <div>
                <h3 className="font-semibold text-slate-700 text-sm mb-2">
                  Linked Jobs ({customerJobs.length})
                </h3>
                {customerJobs.length === 0 ? (
                  <p className="text-sm text-slate-400">No jobs linked to this customer.</p>
                ) : (
                  <div className="space-y-1.5">
                    {customerJobs.map(j => (
                      <button
                        key={j.id}
                        onClick={() => onSelectJob(j.id)}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                      >
                        <span className="font-medium text-slate-700 text-sm truncate flex-1">
                          {j.title || 'Untitled Job'}
                        </span>
                        <span className="text-xs text-slate-400 flex-shrink-0">{j.status.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              <User size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-lg">
                {editId ? 'Edit Customer' : 'New Customer'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="text-slate-400 hover:text-slate-700 transition-colors text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              {([
                ['name', 'Name *', 'text', 'e.g. John Smith'],
                ['phone', 'Phone', 'tel', '(555) 555-5555'],
                ['email', 'Email', 'email', 'john@example.com'],
                ['address', 'Address', 'text', '123 Main St, City, ST'],
              ] as [keyof typeof form, string, string, string][]).map(([key, label, type, placeholder]) => (
                <label key={key} className="block">
                  <span className="text-xs text-slate-500 mb-1 block">{label}</span>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-xs text-slate-500 mb-1 block">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {editId ? 'Save Changes' : 'Create Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-800 text-lg mb-2">Delete Customer?</h3>
            <p className="text-slate-500 text-sm mb-5">
              This will remove the customer record. Existing jobs won't be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  store.deleteCustomer(deleteId);
                  if (selectedId === deleteId) setSelectedId(null);
                  setDeleteId(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
