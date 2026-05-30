import { useState } from 'react';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { NFPA70E_CHECKLIST } from '../data/nfpa70e';

interface Props {
  checklist: Record<string, boolean>;
  onToggle: (itemId: string, checked: boolean) => void;
}

export default function SafetyTab({ checklist, onToggle }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'risk-assessment': true,
    'loto': true,
    'ppe': true,
    'work-area': false,
    'tools': false,
    'post-job': false,
  });

  const totalItems = NFPA70E_CHECKLIST.flatMap(s => s.items).length;
  const checkedItems = Object.values(checklist).filter(Boolean).length;
  const criticalItems = NFPA70E_CHECKLIST.flatMap(s => s.items).filter(i => i.critical);
  const uncheckedCritical = criticalItems.filter(i => !checklist[i.id]);
  const pct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  function toggleSection(id: string) {
    setExpanded(e => ({ ...e, [id]: !e[id] }));
  }

  function sectionProgress(sectionId: string) {
    const section = NFPA70E_CHECKLIST.find(s => s.id === sectionId)!;
    const total = section.items.length;
    const done = section.items.filter(i => checklist[i.id]).length;
    return { done, total };
  }

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {pct === 100 ? (
              <ShieldCheck size={22} className="text-emerald-500" />
            ) : uncheckedCritical.length > 0 ? (
              <ShieldAlert size={22} className="text-red-500" />
            ) : (
              <ShieldCheck size={22} className="text-blue-400" />
            )}
            <h3 className="font-semibold text-slate-800">NFPA 70E Safety Checklist</h3>
          </div>
          <span className="text-sm font-medium text-slate-500">
            {checkedItems} / {totalItems}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-yellow-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Critical items warning */}
        {uncheckedCritical.length > 0 && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
            <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">
                {uncheckedCritical.length} critical item{uncheckedCritical.length > 1 ? 's' : ''} not confirmed:
              </p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {uncheckedCritical.map(i => (
                  <li key={i.id}>• {i.text}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {pct === 100 && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-3">
            <ShieldCheck size={15} className="text-emerald-600" />
            <p className="text-sm text-emerald-700 font-medium">All safety checks confirmed — safe to proceed.</p>
          </div>
        )}
      </div>

      {/* Sections */}
      {NFPA70E_CHECKLIST.map(section => {
        const { done, total } = sectionProgress(section.id);
        const isOpen = expanded[section.id];
        const allDone = done === total;

        return (
          <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    allDone
                      ? 'bg-emerald-100 text-emerald-700'
                      : done > 0
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {done === total ? '✓' : `${done}/${total}`}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800 text-sm">{section.title}</p>
                  {section.description && (
                    <p className="text-xs text-slate-400">{section.description}</p>
                  )}
                </div>
              </div>
              {isOpen ? (
                <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {section.items.map(item => {
                  const checked = !!checklist[item.id];
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                        checked ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => onToggle(item.id, e.target.checked)}
                        className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm leading-snug ${
                            checked ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}
                        >
                          {item.critical && !checked && (
                            <span className="inline-block bg-red-100 text-red-600 text-xs font-semibold px-1.5 py-0.5 rounded mr-2 no-underline" style={{ textDecoration: 'none' }}>
                              CRITICAL
                            </span>
                          )}
                          {item.text}
                        </p>
                        {item.ref && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            NFPA 70E §{item.ref}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-slate-400 text-center pb-2">
        Based on NFPA 70E Standard for Electrical Safety in the Workplace. This checklist does not
        replace site-specific hazard analysis or applicable regulations.
      </p>
    </div>
  );
}
