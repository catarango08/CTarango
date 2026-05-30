import { Download, Send, CheckCircle, FileText } from 'lucide-react';
import type { Job } from '../types';
import { calcBidTotals, formatCurrency, formatDate } from '../utils';
import { exportInvoicePDF } from '../lib/pdf';
import type { BusinessProfile } from '../types';

interface Props {
  job: Job;
  business: BusinessProfile;
  onUpdateJob: (changes: Partial<Job>) => void;
  onGenerateNumber: () => string;
}

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
};

export default function InvoiceTab({ job, business, onUpdateJob, onGenerateNumber }: Props) {
  const { total } = calcBidTotals(job);

  function updateInvoice(changes: Partial<Job['invoice']>) {
    onUpdateJob({ invoice: { ...job.invoice, ...changes } });
  }

  function generateNumber() {
    if (!job.invoice.invoiceNumber) {
      const num = onGenerateNumber();
      const today = new Date().toISOString().split('T')[0];
      const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      updateInvoice({ invoiceNumber: num, issueDate: today, dueDate: due });
    }
  }

  function markSent() {
    updateInvoice({ status: 'sent', sentAt: new Date().toISOString() });
    onUpdateJob({ status: 'invoiced', invoice: { ...job.invoice, status: 'sent', sentAt: new Date().toISOString() } });
  }

  function markPaid() {
    updateInvoice({ status: 'paid', paidAt: new Date().toISOString() });
  }

  function handleExport() {
    exportInvoicePDF(job, business);
  }

  const hasNumber = !!job.invoice.invoiceNumber;

  return (
    <div className="space-y-6">
      {/* Invoice header */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-semibold text-slate-700 text-lg">Invoice</h3>
            {hasNumber && (
              <p className="text-sm text-slate-500">{job.invoice.invoiceNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[job.invoice.status]}`}>
              {job.invoice.status.charAt(0).toUpperCase() + job.invoice.status.slice(1)}
            </span>
          </div>
        </div>

        {!hasNumber ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
            <FileText size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500 text-sm mb-3">No invoice generated yet</p>
            <button
              onClick={generateNumber}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Generate Invoice
            </button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-sm text-slate-600 mb-1 block">Invoice Number</span>
                <input
                  type="text"
                  value={job.invoice.invoiceNumber}
                  onChange={e => updateInvoice({ invoiceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-600 mb-1 block">Payment Terms</span>
                <input
                  type="text"
                  value={job.invoice.paymentTerms}
                  onChange={e => updateInvoice({ paymentTerms: e.target.value })}
                  placeholder="e.g. Net 30, Due on Receipt"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-600 mb-1 block">Issue Date</span>
                <input
                  type="date"
                  value={job.invoice.issueDate}
                  onChange={e => updateInvoice({ issueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-600 mb-1 block">Due Date</span>
                <input
                  type="date"
                  value={job.invoice.dueDate}
                  onChange={e => updateInvoice({ dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <textarea
              value={job.invoice.notes}
              onChange={e => updateInvoice({ notes: e.target.value })}
              placeholder="Payment instructions, account info, or notes for the customer…"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            {/* Amount due */}
            <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between mb-4">
              <span className="font-semibold text-slate-700">Amount Due</span>
              <span className="text-2xl font-bold text-blue-700">{formatCurrency(total)}</span>
            </div>

            {/* Status trail */}
            {job.invoice.sentAt && (
              <p className="text-xs text-slate-400 mb-3">
                Sent: {formatDate(job.invoice.sentAt)}
              </p>
            )}
            {job.invoice.paidAt && (
              <p className="text-xs text-emerald-600 mb-3 font-medium">
                Paid: {formatDate(job.invoice.paidAt)}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                <Download size={15} />
                Export PDF
              </button>
              {job.invoice.status === 'draft' && (
                <button
                  onClick={markSent}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Send size={15} />
                  Mark Sent
                </button>
              )}
              {job.invoice.status === 'sent' && (
                <button
                  onClick={markPaid}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle size={15} />
                  Mark Paid
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
