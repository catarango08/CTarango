import type { Job } from '../types';
import { formatCurrency } from '../utils';
import { calcBidTotals } from '../utils';

interface Props {
  job: Job;
  laborRate: number;
}

function calcActualLaborMs(job: Job): number {
  return job.timeEntries
    .filter(e => e.clockOut !== null)
    .reduce((sum, e) => {
      const ms = new Date(e.clockOut!).getTime() - new Date(e.clockIn).getTime();
      return sum + ms;
    }, 0);
}

function BarComparison({
  label,
  bid,
  actual,
  color,
}: {
  label: string;
  bid: number;
  actual: number;
  color: string;
}) {
  const max = Math.max(bid, actual, 1);
  const bidPct = (bid / max) * 100;
  const actualPct = (actual / max) * 100;
  const over = actual > bid;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className={`font-medium ${over ? 'text-red-600' : 'text-slate-700'}`}>
          {formatCurrency(actual)} <span className="text-slate-400 font-normal">/ {formatCurrency(bid)} bid</span>
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-10">Bid</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${color} opacity-40`} style={{ width: `${bidPct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-10">Actual</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${over ? 'bg-red-500' : color}`}
              style={{ width: `${actualPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PnLTab({ job, laborRate }: Props) {
  const { total: bidTotal } = calcBidTotals(job);
  const approvedCOValue = job.changeOrders
    .filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + co.materialCost + co.laborHours * laborRate, 0);

  const revenue = bidTotal + approvedCOValue;

  // Actual labor cost
  const actualLaborMs = calcActualLaborMs(job);
  const actualLaborHours = actualLaborMs / 1000 / 3600;
  const actualLaborCost = actualLaborHours * laborRate;

  // Bid labor cost
  const bidLaborCost = job.bid.laborHours * laborRate;

  // Actual materials & expenses
  const actualExpenses = job.expenses.reduce((sum, e) => sum + e.amount, 0);

  // Bid material cost (with markup)
  const { materialsWithMarkup } = calcBidTotals(job);

  const totalActualCost = actualLaborCost + actualExpenses;
  const grossProfit = revenue - totalActualCost;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const rows: { label: string; value: number; color: string; indent?: boolean }[] = [
    { label: 'Bid Revenue', value: bidTotal, color: 'text-slate-800' },
    { label: 'Approved Change Orders', value: approvedCOValue, color: 'text-green-700', indent: true },
    { label: 'Total Revenue', value: revenue, color: 'text-blue-700' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-6">
      {/* P&L Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">Revenue</p>
          <p className="text-lg font-bold text-blue-700">{formatCurrency(revenue)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">Actual Cost</p>
          <p className="text-lg font-bold text-slate-700">{formatCurrency(totalActualCost)}</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${grossProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-xs text-slate-500">Gross Profit</p>
          <p className={`text-lg font-bold ${grossProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(grossProfit)}
          </p>
        </div>
        <div className={`rounded-xl p-3 text-center ${margin >= 20 ? 'bg-green-50' : margin >= 0 ? 'bg-yellow-50' : 'bg-red-50'}`}>
          <p className="text-xs text-slate-500">Margin</p>
          <p className={`text-lg font-bold ${margin >= 20 ? 'text-green-700' : margin >= 0 ? 'text-yellow-700' : 'text-red-600'}`}>
            {margin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
        <div className="p-3 bg-slate-50 rounded-t-xl">
          <h3 className="font-semibold text-slate-800 text-sm">Revenue</h3>
        </div>
        {rows.map(row => (
          <div key={row.label} className={`flex justify-between items-center px-3 py-2 text-sm ${row.indent ? 'pl-7' : ''}`}>
            <span className="text-slate-600">{row.label}</span>
            <span className={`font-medium ${row.color}`}>{formatCurrency(row.value)}</span>
          </div>
        ))}
      </div>

      {/* Cost breakdown */}
      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
        <div className="p-3 bg-slate-50 rounded-t-xl">
          <h3 className="font-semibold text-slate-800 text-sm">Costs</h3>
        </div>
        <div className="flex justify-between items-center px-3 py-2 text-sm">
          <span className="text-slate-600">Bid Labor ({job.bid.laborHours}h × {formatCurrency(laborRate)}/hr)</span>
          <span className="text-slate-500">{formatCurrency(bidLaborCost)}</span>
        </div>
        <div className="flex justify-between items-center px-3 py-2 text-sm">
          <span className="text-slate-600 flex items-center gap-1">
            Actual Labor ({actualLaborHours.toFixed(2)}h × {formatCurrency(laborRate)}/hr)
          </span>
          <span className={`font-medium ${actualLaborCost > bidLaborCost ? 'text-red-600' : 'text-slate-700'}`}>
            {formatCurrency(actualLaborCost)}
          </span>
        </div>
        <div className="flex justify-between items-center px-3 py-2 text-sm">
          <span className="text-slate-600">Bid Materials (w/ markup)</span>
          <span className="text-slate-500">{formatCurrency(materialsWithMarkup)}</span>
        </div>
        <div className="flex justify-between items-center px-3 py-2 text-sm">
          <span className="text-slate-600">Actual Expenses</span>
          <span className={`font-medium ${actualExpenses > materialsWithMarkup ? 'text-red-600' : 'text-slate-700'}`}>
            {formatCurrency(actualExpenses)}
          </span>
        </div>
        <div className="flex justify-between items-center px-3 py-2 text-sm bg-slate-50 rounded-b-xl">
          <span className="font-semibold text-slate-700">Total Actual Cost</span>
          <span className="font-semibold text-slate-800">{formatCurrency(totalActualCost)}</span>
        </div>
      </div>

      {/* Visual comparison bars */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm">Bid vs Actual Comparison</h3>
        <BarComparison
          label="Labor"
          bid={bidLaborCost}
          actual={actualLaborCost}
          color="bg-blue-500"
        />
        <BarComparison
          label="Materials / Expenses"
          bid={materialsWithMarkup}
          actual={actualExpenses}
          color="bg-purple-500"
        />
        <BarComparison
          label="Total Cost"
          bid={bidTotal}
          actual={totalActualCost}
          color="bg-slate-500"
        />
      </div>

      {/* Profitability indicator */}
      {revenue > 0 && (
        <div className={`rounded-xl p-4 ${grossProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-semibold text-sm ${grossProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            {grossProfit >= 0
              ? `This job is profitable. You're earning ${margin.toFixed(1)}% margin.`
              : `This job is over budget by ${formatCurrency(Math.abs(grossProfit))}.`}
          </p>
          {actualLaborHours === 0 && (
            <p className="text-xs text-slate-500 mt-1">Clock in time on the Time tab to see actual labor costs.</p>
          )}
        </div>
      )}
    </div>
  );
}
