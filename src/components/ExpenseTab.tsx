import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Job, Expense, ExpenseCategory } from '../types';
import type { useJobStore } from '../store';
import { formatCurrency } from '../utils';

interface Props {
  job: Job;
  store: ReturnType<typeof useJobStore>;
}

const CATEGORIES: ExpenseCategory[] = ['Material', 'Mileage', 'Permit', 'Fuel', 'Parking', 'Tool', 'Other'];

const TAX_DEDUCTIBLE_CATEGORIES: ExpenseCategory[] = ['Mileage', 'Permit', 'Fuel', 'Parking', 'Tool', 'Material'];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Material: 'bg-blue-100 text-blue-700',
  Mileage:  'bg-green-100 text-green-700',
  Permit:   'bg-purple-100 text-purple-700',
  Fuel:     'bg-orange-100 text-orange-700',
  Parking:  'bg-yellow-100 text-yellow-700',
  Tool:     'bg-pink-100 text-pink-700',
  Other:    'bg-slate-100 text-slate-700',
};

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  category: 'Material' as ExpenseCategory,
  description: '',
  amount: '',
  miles: '',
};

export default function ExpenseTab({ job, store }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const mileageRate = store.settings.mileageRate;

  function handleCategoryChange(cat: ExpenseCategory) {
    setForm(f => ({
      ...f,
      category: cat,
      amount: cat === 'Mileage' ? '' : f.amount,
      miles: cat === 'Mileage' ? f.miles : '',
    }));
  }

  function handleMilesChange(val: string) {
    const miles = parseFloat(val) || 0;
    setForm(f => ({
      ...f,
      miles: val,
      amount: miles > 0 ? (miles * mileageRate).toFixed(2) : '',
    }));
  }

  function handleSubmit() {
    const amount = parseFloat(form.amount) || 0;
    if (!form.description.trim() || amount <= 0) return;
    const expense: Omit<Expense, 'id'> = {
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount,
      ...(form.category === 'Mileage' && form.miles ? { miles: parseFloat(form.miles) } : {}),
    };
    store.addExpense(job.id, expense);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  // Totals by category
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = job.expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return acc;
  }, {} as Record<ExpenseCategory, number>);

  const grandTotal = job.expenses.reduce((sum, e) => sum + e.amount, 0);
  const taxDeductible = job.expenses
    .filter(e => TAX_DEDUCTIBLE_CATEGORIES.includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">Total Expenses</p>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(grandTotal)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">Tax Deductible</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(taxDeductible)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500">Mileage Rate</p>
          <p className="text-xl font-bold text-blue-700">${mileageRate.toFixed(2)}/mi</p>
        </div>
      </div>

      {/* Category breakdown */}
      {grandTotal > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">By Category</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter(cat => byCategory[cat] > 0).map(cat => (
              <div key={cat} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${CATEGORY_COLORS[cat]}`}>
                <span>{cat}</span>
                <span className="font-semibold">{formatCurrency(byCategory[cat])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Expense Button / Form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          Add Expense
        </button>
      ) : (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm">New Expense</h3>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-500 mb-1 block">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-500 mb-1 block">Category</span>
              <select
                value={form.category}
                onChange={e => handleCategoryChange(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-slate-500 mb-1 block">Description</span>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={form.category === 'Mileage' ? 'e.g. Home to job site and back' : 'e.g. 20ft of 12/2 wire'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            {form.category === 'Mileage' && (
              <label className="block">
                <span className="text-xs text-slate-500 mb-1 block">Miles</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.miles}
                  onChange={e => handleMilesChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs text-slate-500 mb-1 block">
                Amount ($){form.category === 'Mileage' ? ' (auto-calculated)' : ''}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                readOnly={form.category === 'Mileage' && Boolean(form.miles)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 read-only:bg-slate-50"
              />
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Add
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

      {/* Expense List */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Expenses</h3>
        {job.expenses.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No expenses logged yet.</p>
        ) : (
          <div className="space-y-2">
            {[...job.expenses]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(expense => (
                <div key={expense.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${CATEGORY_COLORS[expense.category]}`}>
                    {expense.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{expense.description}</p>
                    <p className="text-xs text-slate-400">
                      {expense.date}
                      {expense.miles ? ` · ${expense.miles} mi @ $${mileageRate.toFixed(2)}/mi` : ''}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-700 flex-shrink-0">{formatCurrency(expense.amount)}</span>
                  <button
                    onClick={() => store.removeExpense(job.id, expense.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
